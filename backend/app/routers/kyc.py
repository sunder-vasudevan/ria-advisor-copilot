import os
import io
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Client, ClientDocument, Notification
from ..personal_models import PersonalUser
from ..schemas import ClientDocumentOut, KycStatusUpdate, NomineeUpdate, FatcaUpdate, DocRejectRequest
from ..auth import get_current_personal_user
from .clients import _get_advisor_id, _check_client_access
from .notifications import create_notification

router = APIRouter(tags=["kyc"])

VALID_KYC_STATUSES = {"not_started", "in_progress", "submitted", "verified", "expired"}
REQUIRED_DOC_TYPES = {"pan_card", "aadhaar_front", "aadhaar_back", "photo"}
VALID_DOC_TYPES = REQUIRED_DOC_TYPES


# ─── Supabase Storage helpers ─────────────────────────────────────────────────

def _get_supabase():
    from supabase import create_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Supabase storage not configured")
    return create_client(url, key)


def _upload_to_storage(client_id: int, doc_type: str, file_bytes: bytes, filename: str) -> str:
    bucket = os.getenv("SUPABASE_KYC_BUCKET", "aria-kyc-docs")
    ts = int(datetime.utcnow().timestamp())
    storage_path = f"{client_id}/{doc_type}_{ts}_{filename}"
    sb = _get_supabase()
    sb.storage.from_(bucket).upload(storage_path, file_bytes, {"content-type": "application/octet-stream"})
    return storage_path


def _get_signed_url(storage_path: str) -> str:
    bucket = os.getenv("SUPABASE_KYC_BUCKET", "aria-kyc-docs")
    sb = _get_supabase()
    result = sb.storage.from_(bucket).create_signed_url(storage_path, 3600)
    return result.get("signedURL") or result.get("data", {}).get("signedUrl", "")


def _delete_from_storage(storage_path: str):
    bucket = os.getenv("SUPABASE_KYC_BUCKET", "aria-kyc-docs")
    sb = _get_supabase()
    sb.storage.from_(bucket).remove([storage_path])


# ─── KYC status auto-advance ──────────────────────────────────────────────────

def _maybe_advance_kyc_status(client: Client, db: Session):
    existing_types = {d.doc_type for d in db.query(ClientDocument).filter(ClientDocument.client_id == client.id).all()}
    if client.kyc_status == "not_started":
        client.kyc_status = "in_progress"
    if REQUIRED_DOC_TYPES.issubset(existing_types) and client.kyc_status in ("not_started", "in_progress"):
        client.kyc_status = "submitted"


# ─── PDF generation ──────────────────────────────────────────────────────────

def _generate_risk_pdf(client: Client) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()

    # Header
    pdf.set_fill_color(15, 23, 42)
    pdf.rect(0, 0, 210, 30, "F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_xy(0, 8)
    pdf.cell(210, 10, "ARIA - Risk Profile Report", align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_xy(0, 20)
    pdf.cell(210, 6, "Advisor Relationship Intelligence Assistant", align="C")

    # Body
    pdf.set_text_color(0, 0, 0)
    pdf.set_xy(20, 40)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Client Risk Profile", ln=True)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_x(20)
    pdf.ln(4)

    fields = [
        ("Client Name", client.name or "N/A"),
        ("PAN Number", client.pan_number or "Not provided"),
        ("Date of Birth", str(client.date_of_birth) if client.date_of_birth else "Not provided"),
        ("Segment", client.segment or "N/A"),
        ("Risk Score", f"{client.risk_score} / 10"),
        ("Risk Category", client.risk_category or "N/A"),
        ("Generated On", datetime.utcnow().strftime("%d %b %Y")),
    ]

    for label, value in fields:
        pdf.set_x(20)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(60, 8, label + ":", ln=False)
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 8, value, ln=True)

    # Risk description block
    pdf.ln(6)
    pdf.set_x(20)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(0, 8, "Risk Assessment Summary", ln=True)
    pdf.set_x(20)
    pdf.set_font("Helvetica", "", 10)
    risk_desc = {
        "Conservative": "This client prefers capital preservation with minimal risk. Recommended allocation: 70-80% debt, 10-20% equity, 10% cash.",
        "Moderate": "This client seeks a balance between growth and stability. Recommended allocation: 50-60% equity, 30-40% debt, 10% cash.",
        "Aggressive": "This client prioritises high growth and can tolerate significant volatility. Recommended allocation: 70-80% equity, 10-20% debt, 10% cash.",
    }.get(client.risk_category or "", "Risk category not determined.")
    pdf.multi_cell(170, 6, risk_desc)

    # Disclaimer
    pdf.ln(8)
    pdf.set_x(20)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(170, 5, "This document is generated by ARIA for advisory reference only. It does not constitute financial advice. The risk profile is based on client-provided information and the ARIA risk questionnaire.")

    # Watermark
    pdf.set_font("Helvetica", "B", 42)
    pdf.set_text_color(220, 220, 220)
    with pdf.rotation(45, 55, 190):
        pdf.text(30, 200, "PENDING SIGNATURE")

    return bytes(pdf.output())


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.patch("/clients/{client_id}/kyc/status")
def update_kyc_status(
    client_id: int,
    payload: KycStatusUpdate,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    if payload.kyc_status not in VALID_KYC_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid kyc_status. Must be one of: {VALID_KYC_STATUSES}")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)
    client.kyc_status = payload.kyc_status
    db.commit()
    return {"id": client_id, "kyc_status": client.kyc_status}


@router.patch("/clients/{client_id}/kyc/nominee")
def update_nominee(
    client_id: int,
    payload: NomineeUpdate,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)
    if payload.nominee_name is not None:
        client.nominee_name = payload.nominee_name
    if payload.nominee_relation is not None:
        client.nominee_relation = payload.nominee_relation
    if payload.nominee_dob is not None:
        client.nominee_dob = payload.nominee_dob
    if payload.nominee_phone is not None:
        client.nominee_phone = payload.nominee_phone
    db.commit()
    return {
        "id": client_id,
        "nominee_name": client.nominee_name,
        "nominee_relation": client.nominee_relation,
        "nominee_dob": str(client.nominee_dob) if client.nominee_dob else None,
        "nominee_phone": client.nominee_phone,
    }


@router.patch("/clients/{client_id}/kyc/fatca")
def update_fatca(
    client_id: int,
    payload: FatcaUpdate,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)
    client.fatca_declaration = payload.declared
    client.fatca_declared_at = datetime.utcnow() if payload.declared else None
    db.commit()
    return {
        "id": client_id,
        "fatca_declaration": client.fatca_declaration,
        "fatca_declared_at": client.fatca_declared_at.isoformat() if client.fatca_declared_at else None,
    }


@router.post("/clients/{client_id}/kyc/documents", response_model=ClientDocumentOut)
async def upload_document(
    client_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    if doc_type not in VALID_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Must be one of: {VALID_DOC_TYPES}")
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)

    file_bytes = await file.read()
    storage_path = _upload_to_storage(client_id, doc_type, file_bytes, file.filename or "upload")

    # Replace existing doc of the same type
    existing = db.query(ClientDocument).filter(
        ClientDocument.client_id == client_id,
        ClientDocument.doc_type == doc_type,
    ).first()
    if existing:
        try:
            _delete_from_storage(existing.file_url)
        except Exception:
            pass
        db.delete(existing)

    doc = ClientDocument(
        client_id=client_id,
        advisor_id=advisor_id,
        doc_type=doc_type,
        file_url=storage_path,
        file_name=file.filename or "upload",
        status="pending",
        rejection_reason=None,
    )
    db.add(doc)
    db.flush()

    _maybe_advance_kyc_status(client, db)
    db.commit()
    db.refresh(doc)

    signed_url = _get_signed_url(storage_path)
    return ClientDocumentOut(
        id=doc.id,
        doc_type=doc.doc_type,
        file_name=doc.file_name,
        signed_url=signed_url,
        uploaded_at=doc.uploaded_at,
        status=doc.status or "pending",
        rejection_reason=doc.rejection_reason,
    )


@router.get("/clients/{client_id}/kyc/documents", response_model=List[ClientDocumentOut])
def list_documents(
    client_id: int,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)

    docs = db.query(ClientDocument).filter(ClientDocument.client_id == client_id).all()
    result = []
    for doc in docs:
        try:
            signed_url = _get_signed_url(doc.file_url)
        except Exception:
            signed_url = ""
        result.append(ClientDocumentOut(
            id=doc.id,
            doc_type=doc.doc_type,
            file_name=doc.file_name,
            signed_url=signed_url,
            uploaded_at=doc.uploaded_at,
            status=doc.status or "pending",
            rejection_reason=doc.rejection_reason,
        ))
    return result


@router.delete("/clients/{client_id}/kyc/documents/{doc_id}", status_code=204)
def delete_document(
    client_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)

    doc = db.query(ClientDocument).filter(
        ClientDocument.id == doc_id,
        ClientDocument.client_id == client_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        _delete_from_storage(doc.file_url)
    except Exception:
        pass

    db.delete(doc)
    db.commit()


@router.patch("/clients/{client_id}/kyc/documents/{doc_id}/verify")
def verify_document(
    client_id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)

    doc = db.query(ClientDocument).filter(
        ClientDocument.id == doc_id,
        ClientDocument.client_id == client_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = "verified"
    doc.rejection_reason = None

    all_docs = db.query(ClientDocument).filter(ClientDocument.client_id == client_id).all()
    verified_types = {d.doc_type for d in all_docs if d.status == "verified"}
    if REQUIRED_DOC_TYPES.issubset(verified_types):
        client.kyc_status = "verified"

    db.commit()
    return {"id": doc_id, "status": "verified", "kyc_status": client.kyc_status}


@router.patch("/clients/{client_id}/kyc/documents/{doc_id}/reject")
def reject_document(
    client_id: int,
    doc_id: int,
    payload: DocRejectRequest,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)

    doc = db.query(ClientDocument).filter(
        ClientDocument.id == doc_id,
        ClientDocument.client_id == client_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = "rejected"
    doc.rejection_reason = payload.reason
    if client.kyc_status not in ("not_started", "in_progress"):
        client.kyc_status = "in_progress"

    doc_label = doc.doc_type.replace("_", " ").title()
    if client.personal_user_id:
        create_notification(
            db=db,
            personal_user_id=client.personal_user_id,
            notification_type="kyc_doc_rejected",
            message=f"Your {doc_label} was rejected: {payload.reason}",
        )

    db.commit()
    return {"id": doc_id, "status": "rejected", "kyc_status": client.kyc_status}


# ─── Personal-facing KYC endpoints ───────────────────────────────────────────

@router.get("/personal/kyc/status")
def personal_kyc_status(
    db: Session = Depends(get_db),
    current_user: PersonalUser = Depends(get_current_personal_user),
):
    client = db.query(Client).filter(Client.personal_user_id == current_user.id).first()
    if not client:
        return {"kyc_status": "not_started", "documents": []}

    docs = db.query(ClientDocument).filter(ClientDocument.client_id == client.id).all()
    doc_list = []
    for doc in docs:
        try:
            signed_url = _get_signed_url(doc.file_url)
        except Exception:
            signed_url = ""
        doc_list.append({
            "id": doc.id,
            "doc_type": doc.doc_type,
            "file_name": doc.file_name,
            "status": doc.status or "pending",
            "rejection_reason": doc.rejection_reason,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "signed_url": signed_url,
        })

    return {"kyc_status": client.kyc_status, "documents": doc_list}


@router.post("/personal/kyc/documents")
async def personal_upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user: PersonalUser = Depends(get_current_personal_user),
):
    if doc_type not in VALID_DOC_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid doc_type. Must be one of: {VALID_DOC_TYPES}")

    client = db.query(Client).filter(Client.personal_user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="No linked client profile found")

    advisor_id = client.advisor_id
    if not advisor_id:
        raise HTTPException(status_code=400, detail="Client is not linked to an advisor")

    file_bytes = await file.read()
    storage_path = _upload_to_storage(client.id, doc_type, file_bytes, file.filename or "upload")

    existing = db.query(ClientDocument).filter(
        ClientDocument.client_id == client.id,
        ClientDocument.doc_type == doc_type,
    ).first()
    if existing:
        try:
            _delete_from_storage(existing.file_url)
        except Exception:
            pass
        db.delete(existing)

    doc = ClientDocument(
        client_id=client.id,
        advisor_id=advisor_id,
        doc_type=doc_type,
        file_url=storage_path,
        file_name=file.filename or "upload",
        status="pending",
        rejection_reason=None,
    )
    db.add(doc)
    db.flush()

    _maybe_advance_kyc_status(client, db)

    doc_label = doc_type.replace("_", " ").title()
    create_notification(
        db=db,
        advisor_id=advisor_id,
        notification_type="kyc_doc_uploaded",
        message=f"{client.name} uploaded {doc_label} for KYC review",
    )

    db.commit()
    db.refresh(doc)

    try:
        signed_url = _get_signed_url(storage_path)
    except Exception:
        signed_url = ""

    return {
        "id": doc.id,
        "doc_type": doc.doc_type,
        "file_name": doc.file_name,
        "status": doc.status,
        "rejection_reason": doc.rejection_reason,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        "signed_url": signed_url,
        "kyc_status": client.kyc_status,
    }


@router.get("/clients/{client_id}/kyc/risk-pdf")
def download_risk_pdf(
    client_id: int,
    db: Session = Depends(get_db),
    advisor_id: int = Depends(_get_advisor_id),
    x_advisor_role: Optional[str] = None,
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    _check_client_access(client, advisor_id, x_advisor_role)

    try:
        pdf_bytes = _generate_risk_pdf(client)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=risk_profile_{client_id}.pdf"},
    )
