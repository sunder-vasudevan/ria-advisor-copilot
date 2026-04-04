"""Billing Router — FEAT-1009: Advisor fee config, invoice generation, cash collection."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from ..database import SessionLocal
from .. import models


router = APIRouter(prefix="/billing", tags=["billing"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _compute_amount(fee_type: str, rate: float, portfolio_value: float, settled_trade_count: int = 0) -> float:
    if fee_type == "aum":
        return round((portfolio_value * rate / 100) / 12, 2)
    elif fee_type == "retainer":
        return round(rate, 2)
    elif fee_type == "per_trade":
        return round(rate * settled_trade_count, 2)
    elif fee_type == "onboarding":
        return round(rate, 2)
    return 0.0


def _period_start_end(billing_period: str) -> tuple[date, date]:
    today = date.today()
    if billing_period == "quarterly":
        month_start = ((today.month - 1) // 3) * 3 + 1
        start = date(today.year, month_start, 1)
        end_month = month_start + 2
        end_year = today.year
        if end_month > 12:
            end_month -= 12
            end_year += 1
        import calendar
        end = date(end_year, end_month, calendar.monthrange(end_year, end_month)[1])
    else:
        import calendar
        start = date(today.year, today.month, 1)
        end = date(today.year, today.month, calendar.monthrange(today.year, today.month)[1])
    return start, end


# ─── Fee Config Endpoints ────────────────────────────────────────────────────

@router.get("/fee-config")
def get_fee_config(
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    config = db.query(models.AdvisorFeeConfig).filter(
        models.AdvisorFeeConfig.advisor_id == x_advisor_id
    ).first()
    if not config:
        return {"success": True, "data": None}
    return {"success": True, "data": {
        "id": config.id,
        "fee_type": config.fee_type.value,
        "rate": config.rate,
        "billing_period": config.billing_period.value,
    }}


@router.put("/fee-config")
def set_fee_config(
    payload: dict,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    config = db.query(models.AdvisorFeeConfig).filter(
        models.AdvisorFeeConfig.advisor_id == x_advisor_id
    ).first()
    if config:
        config.fee_type = payload["fee_type"]
        config.rate = payload["rate"]
        config.billing_period = payload.get("billing_period", "monthly")
    else:
        config = models.AdvisorFeeConfig(
            advisor_id=x_advisor_id,
            fee_type=payload["fee_type"],
            rate=payload["rate"],
            billing_period=payload.get("billing_period", "monthly"),
        )
        db.add(config)
    db.commit()
    db.refresh(config)
    return {"success": True, "data": {
        "id": config.id,
        "fee_type": config.fee_type.value,
        "rate": config.rate,
        "billing_period": config.billing_period.value,
    }}


@router.get("/clients/{client_id}/fee-config")
def get_client_fee_config(
    client_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == x_advisor_id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    override = db.query(models.ClientFeeConfig).filter(
        models.ClientFeeConfig.client_id == client_id
    ).first()
    if not override:
        return {"success": True, "data": None, "source": "no_override"}

    return {"success": True, "data": {
        "id": override.id,
        "fee_type": override.fee_type.value,
        "rate": override.rate,
        "billing_period": override.billing_period.value,
    }, "source": "client_override"}


@router.put("/clients/{client_id}/fee-config")
def set_client_fee_config(
    client_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == x_advisor_id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    override = db.query(models.ClientFeeConfig).filter(
        models.ClientFeeConfig.client_id == client_id
    ).first()
    if override:
        override.fee_type = payload["fee_type"]
        override.rate = payload["rate"]
        override.billing_period = payload.get("billing_period", "monthly")
    else:
        override = models.ClientFeeConfig(
            client_id=client_id,
            fee_type=payload["fee_type"],
            rate=payload["rate"],
            billing_period=payload.get("billing_period", "monthly"),
        )
        db.add(override)
    db.commit()
    db.refresh(override)
    return {"success": True, "data": {
        "id": override.id,
        "fee_type": override.fee_type.value,
        "rate": override.rate,
        "billing_period": override.billing_period.value,
    }}


# ─── Invoice Endpoints ───────────────────────────────────────────────────────

def _invoice_to_dict(inv: models.Invoice) -> dict:
    return {
        "id": inv.id,
        "client_id": inv.client_id,
        "client_name": inv.client.name if inv.client else None,
        "advisor_id": inv.advisor_id,
        "fee_type": inv.fee_type.value,
        "amount": inv.amount,
        "period_start": inv.period_start.isoformat(),
        "period_end": inv.period_end.isoformat(),
        "status": inv.status.value,
        "description": inv.description,
        "created_at": inv.created_at.isoformat(),
        "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
        "trade_id": inv.trade_id,
    }


@router.get("/clients/{client_id}/invoices")
def get_client_invoices(
    client_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == x_advisor_id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    invoices = db.query(models.Invoice).filter(
        models.Invoice.client_id == client_id
    ).order_by(models.Invoice.created_at.desc()).all()

    return {"success": True, "data": [_invoice_to_dict(i) for i in invoices]}


@router.post("/clients/{client_id}/invoices")
def create_invoice(
    client_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == x_advisor_id,
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    # Resolve fee config: client override > advisor default > payload
    override = db.query(models.ClientFeeConfig).filter(
        models.ClientFeeConfig.client_id == client_id
    ).first()
    advisor_config = db.query(models.AdvisorFeeConfig).filter(
        models.AdvisorFeeConfig.advisor_id == x_advisor_id
    ).first()

    fee_type = payload.get("fee_type") or (override.fee_type.value if override else None) or (advisor_config.fee_type.value if advisor_config else "aum")
    rate = payload.get("rate") or (override.rate if override else None) or (advisor_config.rate if advisor_config else 1.0)
    billing_period = payload.get("billing_period") or (override.billing_period.value if override else None) or (advisor_config.billing_period.value if advisor_config else "monthly")

    # Get portfolio value
    portfolio = client.portfolio
    portfolio_value = portfolio.total_value if portfolio else 0.0

    # Count settled trades in period if per_trade
    settled_count = 0
    if fee_type == "per_trade":
        settled_count = db.query(models.Trade).filter(
            models.Trade.client_id == client_id,
            models.Trade.status == models.TradeStatusEnum.settled,
        ).count()

    amount = _compute_amount(fee_type, rate, portfolio_value, settled_count)

    period_start, period_end = _period_start_end(billing_period)

    description = payload.get("description") or f"{fee_type.replace('_', ' ').title()} Fee – {date.today().strftime('%b %Y')}"

    invoice = models.Invoice(
        client_id=client_id,
        advisor_id=x_advisor_id,
        fee_type=fee_type,
        amount=amount,
        period_start=period_start,
        period_end=period_end,
        status="pending",
        description=description,
        trade_id=payload.get("trade_id"),
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {"success": True, "data": _invoice_to_dict(invoice)}


@router.put("/invoices/{invoice_id}/collect")
def collect_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id,
        models.Invoice.advisor_id == x_advisor_id,
    ).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found or access denied")
    if invoice.status.value == "paid":
        raise HTTPException(status_code=400, detail="Invoice already paid")
    if invoice.status.value == "waived":
        raise HTTPException(status_code=400, detail="Invoice is waived")

    # Validate cash balance
    client = db.query(models.Client).filter(models.Client.id == invoice.client_id).first()
    portfolio = client.portfolio if client else None
    if not portfolio:
        raise HTTPException(status_code=400, detail="Client has no portfolio")

    cash = portfolio.cash_balance or 0.0
    if cash < invoice.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient cash balance. Available: ₹{cash:,.0f}, Required: ₹{invoice.amount:,.0f}"
        )

    # Deduct from portfolio
    portfolio.cash_balance = round(cash - invoice.amount, 2)
    portfolio.total_value = round((portfolio.total_value or 0.0) - invoice.amount, 2)

    # Mark paid
    invoice.status = "paid"
    invoice.paid_at = datetime.utcnow()

    db.commit()
    db.refresh(invoice)
    return {"success": True, "data": _invoice_to_dict(invoice)}


@router.get("/invoices")
def get_all_invoices(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    x_advisor_id: int = Header(..., alias="X-Advisor-Id"),
):
    q = db.query(models.Invoice).filter(models.Invoice.advisor_id == x_advisor_id)
    if status:
        q = q.filter(models.Invoice.status == status)
    invoices = q.order_by(models.Invoice.created_at.desc()).all()
    return {"success": True, "data": [_invoice_to_dict(i) for i in invoices]}


# ─── Personal Portal: client views their own invoices ─────────────────────────

@router.get("/personal/me/invoices")
def get_personal_invoices(
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(..., alias="X-Personal-User-Id"),
):
    # Resolve client_id from personal_user_id
    from sqlalchemy import text
    row = db.execute(
        text("SELECT id FROM clients WHERE personal_user_id = :uid LIMIT 1"),
        {"uid": x_personal_user_id}
    ).fetchone()
    if not row:
        return {"success": True, "data": []}

    client_id = row[0]
    invoices = db.query(models.Invoice).filter(
        models.Invoice.client_id == client_id
    ).order_by(models.Invoice.created_at.desc()).all()
    return {"success": True, "data": [_invoice_to_dict(i) for i in invoices]}
