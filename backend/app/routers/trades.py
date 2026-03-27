"""Trade Management Router — Phase 1A Backend."""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime

from ..database import SessionLocal
from .. import models, schemas
from ..auth import get_current_personal_user
from .notifications import create_notification


router = APIRouter(prefix="/trades", tags=["trades"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_client_id_for_personal_user(personal_user_id: int, db: Session) -> Optional[int]:
    """Resolve client_id from personal_user_id via portfolio lookup."""
    row = db.execute(
        text("SELECT client_id FROM portfolios WHERE personal_user_id = :uid LIMIT 1"),
        {"uid": personal_user_id}
    ).fetchone()
    return row[0] if row else None


# ─── CRUD Endpoints ─────────────────────────────────────────────────────────

@router.post("/clients/{client_id}/trades", response_model=schemas.TradeOut)
def create_trade_draft(
    client_id: int,
    trade_data: schemas.TradeCreate,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    """
    Advisor creates a trade (saved as draft).

    Request headers: X-Advisor-Id (from JWT token)
    Status: draft
    """
    # Verify advisor owns this client
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == x_advisor_id
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    # Create trade
    trade = models.Trade(
        client_id=client_id,
        advisor_id=x_advisor_id,
        asset_type=trade_data.asset_type,
        action=trade_data.action,
        asset_code=trade_data.asset_code,
        quantity=trade_data.quantity,
        estimated_value=trade_data.estimated_value,
        status=models.TradeStatusEnum.draft,
        advisor_note=trade_data.advisor_note,
    )
    db.add(trade)
    db.flush()

    # Log creation
    audit_log = models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.created,
        actor=models.TradeActorEnum.advisor,
        note=f"Trade created as draft: {trade_data.asset_type} {trade_data.action} {trade_data.asset_code}",
    )
    db.add(audit_log)
    db.commit()
    db.refresh(trade)

    return trade


@router.put("/{trade_id}", response_model=schemas.TradeOut)
def submit_trade_for_approval(
    trade_id: int,
    submit_data: schemas.TradeSubmit,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    """
    Advisor submits trade for approval (draft → pending_approval).

    Status transition: draft → pending_approval
    """
    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id,
        models.Trade.advisor_id == x_advisor_id,
    ).first()

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or access denied")

    if trade.status != models.TradeStatusEnum.draft:
        raise HTTPException(
            status_code=400,
            detail=f"Can only submit draft trades. Current status: {trade.status.value}"
        )

    # Update status
    trade.status = models.TradeStatusEnum.pending_approval
    trade.submitted_at = datetime.utcnow()
    if submit_data.advisor_note:
        trade.advisor_note = submit_data.advisor_note

    # Log submission
    audit_log = models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.submitted,
        actor=models.TradeActorEnum.advisor,
        note="Trade submitted for client approval",
    )
    db.add(audit_log)

    # Create notification for client (FEAT-1004)
    client = db.query(models.Client).filter(models.Client.id == trade.client_id).first()
    if client and client.personal_user_id:
        notification = create_notification(
            db=db,
            personal_user_id=client.personal_user_id,
            notification_type=models.NotificationTypeEnum.trade_submitted.value,
            trade_id=trade.id,
            message=f"New trade pending your approval: {trade.action} {trade.asset_code} ({trade.quantity} units, ₹{trade.estimated_value})",
        )

    db.commit()
    db.refresh(trade)

    return trade


@router.put("/{trade_id}/approve", response_model=schemas.TradeOut)
def approve_trade(
    trade_id: int,
    approve_data: schemas.TradeApprove,
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Client approves trade (pending_approval → approved → settled).

    - Status: pending_approval → approved
    - Mock banking: Create debit/credit log
    - Status: approved → settled (system auto-settles)

    Request headers: X-Personal-User-Id (from JWT token)
    """
    if not x_personal_user_id:
        raise HTTPException(status_code=401, detail="X-Personal-User-Id header required")

    # Resolve client_id from personal user
    client_id = _get_client_id_for_personal_user(x_personal_user_id, db)
    if not client_id:
        raise HTTPException(status_code=404, detail="No client linked to this user")

    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id,
        models.Trade.client_id == client_id,
    ).first()

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or access denied")

    if trade.status != models.TradeStatusEnum.pending_approval:
        raise HTTPException(
            status_code=400,
            detail=f"Can only approve pending trades. Current status: {trade.status.value}"
        )

    # Update status to approved
    trade.status = models.TradeStatusEnum.approved
    trade.approved_at = datetime.utcnow()
    if approve_data.client_comment:
        trade.client_comment = approve_data.client_comment

    # Log approval
    audit_log_approve = models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.approved,
        actor=models.TradeActorEnum.client,
        note=f"Trade approved by client. Comment: {approve_data.client_comment or 'None'}",
    )
    db.add(audit_log_approve)
    db.flush()

    # System auto-settles (mock banking)
    trade.status = models.TradeStatusEnum.settled
    trade.executed_at = datetime.utcnow()
    trade.settled_at = datetime.utcnow()
    trade.actual_value = trade.estimated_value  # Mock: use estimated for actual

    # Log settlement (mock banking)
    audit_log_settle = models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.settled,
        actor=models.TradeActorEnum.system,
        note=f"Mock banking executed: {trade.asset_type.value} {trade.action.value} {trade.asset_code} × {trade.quantity} @ ₹{trade.estimated_value}",
    )
    db.add(audit_log_settle)

    # Create notification for advisor (FEAT-1004)
    notification = create_notification(
        db=db,
        advisor_id=trade.advisor_id,
        notification_type=models.NotificationTypeEnum.trade_approved.value,
        trade_id=trade.id,
        message=f"Trade approved by {trade.client_id}: {trade.action} {trade.asset_code} ({trade.quantity} units). Settling now.",
    )

    db.commit()
    db.refresh(trade)

    return trade


@router.put("/{trade_id}/reject", response_model=schemas.TradeOut)
def reject_trade(
    trade_id: int,
    reject_data: schemas.TradeReject,
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Client rejects trade (pending_approval → rejected).

    Request headers: X-Personal-User-Id (from JWT token)
    """
    if not x_personal_user_id:
        raise HTTPException(status_code=401, detail="X-Personal-User-Id header required")

    # Resolve client_id from personal user
    client_id = _get_client_id_for_personal_user(x_personal_user_id, db)
    if not client_id:
        raise HTTPException(status_code=404, detail="No client linked to this user")

    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id,
        models.Trade.client_id == client_id,
    ).first()

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or access denied")

    if trade.status != models.TradeStatusEnum.pending_approval:
        raise HTTPException(
            status_code=400,
            detail=f"Can only reject pending trades. Current status: {trade.status.value}"
        )

    # Update status
    trade.status = models.TradeStatusEnum.rejected
    if reject_data.client_comment:
        trade.client_comment = reject_data.client_comment

    # Log rejection
    audit_log = models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.rejected,
        actor=models.TradeActorEnum.client,
        note=f"Trade rejected by client. Reason: {reject_data.client_comment or 'None'}",
    )
    db.add(audit_log)

    # Create notification for advisor (FEAT-1004)
    notification = create_notification(
        db=db,
        advisor_id=trade.advisor_id,
        notification_type=models.NotificationTypeEnum.trade_rejected.value,
        trade_id=trade.id,
        message=f"Trade rejected by client: {trade.action} {trade.asset_code}. Reason: {trade.client_comment or 'None'}",
    )

    db.commit()
    db.refresh(trade)

    return trade


@router.get("/clients/{client_id}/trades", response_model=List[schemas.TradeOut])
def list_advisor_trades(
    client_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    """
    Advisor views all trades for a client (ARIA Advisor perspective).

    Returns: All trades (draft, pending_approval, approved, rejected, settled, cancelled)
    """
    # Verify advisor owns this client
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == x_advisor_id
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    trades = db.query(models.Trade).filter(
        models.Trade.client_id == client_id
    ).order_by(models.Trade.created_at.desc()).all()

    return trades


# ─── Personal App Endpoints (JWT-based) ─ MUST come before {client_id} routes ──

@router.get("/personal/clients/me/trades", response_model=List[schemas.TradeOut])
def list_personal_trades_jwt(
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Personal app client views their trades using JWT.

    Header: X-Personal-User-Id (from personal JWT)
    """
    if not x_personal_user_id:
        raise HTTPException(status_code=401, detail="X-Personal-User-Id header required")

    # Resolve client_id from personal_user_id
    client_id = _get_client_id_for_personal_user(x_personal_user_id, db)
    if not client_id:
        raise HTTPException(status_code=404, detail="No client linked to this user")

    trades = db.query(models.Trade).filter(
        models.Trade.client_id == client_id
    ).order_by(models.Trade.created_at.desc()).all()

    return trades


@router.get("/personal/clients/{client_id}/trades", response_model=List[schemas.TradeOut])
def list_personal_trades(
    client_id: int,
    db: Session = Depends(get_db),
    x_client_id: int = Header(None, alias="X-Client-Id"),
):
    """
    Client views their trades (ARIA Personal perspective).

    Returns: All trades for this client
    """
    if not x_client_id:
        raise HTTPException(status_code=401, detail="X-Client-Id header required")

    # Verify client is viewing their own trades
    if x_client_id != client_id:
        raise HTTPException(status_code=403, detail="Access denied")

    trades = db.query(models.Trade).filter(
        models.Trade.client_id == client_id
    ).order_by(models.Trade.created_at.desc()).all()

    return trades


@router.put("/{trade_id}/tx-hash", response_model=schemas.TradeOut)
def update_crypto_tx_hash(
    trade_id: int,
    tx_data: schemas.TradeUpdateTxHash,
    db: Session = Depends(get_db),
    x_client_id: int = Header(None, alias="X-Client-Id"),
):
    """
    Client provides transaction hash for crypto trade after external execution.

    Only available for crypto trades in 'approved' status.
    """
    if not x_client_id:
        raise HTTPException(status_code=401, detail="X-Client-Id header required")

    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id,
        models.Trade.client_id == x_client_id,
    ).first()

    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or access denied")

    if trade.asset_type != models.AssetTypeEnum.crypto:
        raise HTTPException(status_code=400, detail="Only crypto trades can have tx_hash")

    if trade.status != models.TradeStatusEnum.approved:
        raise HTTPException(
            status_code=400,
            detail=f"Can only update tx_hash on approved trades. Current status: {trade.status.value}"
        )

    # Update tx hash
    trade.tx_hash = tx_data.tx_hash

    # Log tx hash
    audit_log = models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.executed,
        actor=models.TradeActorEnum.client,
        note=f"Client provided execution proof (tx_hash): {tx_data.tx_hash}",
    )
    db.add(audit_log)
    db.commit()
    db.refresh(trade)

    return trade
