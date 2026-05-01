"""Trade Management Router — Phase 1A Backend."""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime

from ..database import SessionLocal
from .. import models, schemas
from ..auth import get_current_personal_user, get_current_advisor_user
from .notifications import create_notification


router = APIRouter(prefix="/trades", tags=["trades"])

MIN_QUANTITY = {"crypto": 0.0001, "stock": 1.0, "mutual_fund": 0.0001}


def _validate_min_quantity(asset_type: str, quantity: float):
    min_qty = MIN_QUANTITY.get(asset_type, 0.0001)
    if quantity < min_qty:
        label = {"crypto": f"{min_qty} units (e.g. 0.0001 BTC)", "stock": "1 unit (whole shares only)", "mutual_fund": f"{min_qty} units"}.get(asset_type, str(min_qty))
        raise HTTPException(status_code=400, detail=f"Minimum quantity for {asset_type} is {label}")



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
    current_advisor=Depends(get_current_advisor_user),
):
    """Advisor creates a trade (saved as draft). Status: draft"""
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == current_advisor.id
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found or access denied")

    _validate_min_quantity(trade_data.asset_type, trade_data.quantity)

    trade = models.Trade(
        client_id=client_id,
        advisor_id=current_advisor.id,
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
    current_advisor=Depends(get_current_advisor_user),
):
    """Advisor submits trade for approval (draft → pending_approval)."""
    trade = db.query(models.Trade).filter(
        models.Trade.id == trade_id,
        models.Trade.advisor_id == current_advisor.id,
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
        # Validate: Portfolio must be linked to client for notification to work
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.client_id == client.id,
            models.Portfolio.personal_user_id == client.personal_user_id
        ).first()

        if not portfolio:
            # Log warning but don't fail — notification won't be created but trade submission succeeds
            print(f"[WARN] Client {client.id} personal_user_id={client.personal_user_id} has no linked portfolio. Notification skipped.")
        else:
            notification = create_notification(
                db=db,
                personal_user_id=client.personal_user_id,
                notification_type=models.NotificationTypeEnum.trade_submitted.value,
                trade_id=trade.id,
                message=f"New trade pending your approval: {trade.action.value} {trade.asset_code} ({trade.quantity} units, ₹{trade.estimated_value})",
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

    # Balance check before approval
    portfolio = _get_portfolio_for_personal_user(x_personal_user_id, db)
    if portfolio:
        if trade.action.value == "buy":
            bal = _check_buy_balance(portfolio, trade.estimated_value)
            if not bal["sufficient"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient cash balance. Available: ₹{bal['available']:,.0f}, Required: ₹{bal['required']:,.0f}. Update quantity or top up cash."
                )
        elif trade.action.value == "sell":
            bal = _check_sell_balance(portfolio, trade.asset_code, trade.quantity)
            if not bal["sufficient"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient holdings. Available: {bal['available']} units of {trade.asset_code}, Required: {bal['required']}."
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

    # Update portfolio balances on settlement
    exec_price = trade.estimated_value / trade.quantity if trade.quantity else 0.0
    trade.execution_price = exec_price

    if portfolio:
        if trade.action.value == "buy":
            portfolio.cash_balance = (portfolio.cash_balance or 0.0) - trade.estimated_value
            holding = next(
                (h for h in portfolio.holdings if h.asset_code and h.asset_code.upper() == trade.asset_code.upper()),
                None,
            )
            if holding:
                old_units = holding.units_held or 0.0
                old_avg = holding.avg_purchase_price or exec_price
                new_units = old_units + trade.quantity
                holding.avg_purchase_price = round(((old_units * old_avg) + (trade.quantity * exec_price)) / new_units, 4) if new_units else exec_price
                holding.units_held = new_units
                holding.current_value = round(new_units * (holding.nav_per_unit or exec_price), 2)
            else:
                db.add(models.Holding(
                    portfolio_id=portfolio.id,
                    asset_type=trade.asset_type.value,
                    asset_code=trade.asset_code,
                    fund_name=trade.asset_code,
                    current_value=trade.estimated_value,
                    target_pct=0.0,
                    current_pct=0.0,
                    units_held=trade.quantity,
                    nav_per_unit=exec_price,
                    avg_purchase_price=exec_price,
                ))
        else:  # sell — avg_purchase_price unchanged (cost basis stays)
            holding = next(
                (h for h in portfolio.holdings if h.asset_code and h.asset_code.upper() == trade.asset_code.upper()),
                None,
            )
            if holding:
                remaining_units = max(0.0, (holding.units_held or 0.0) - trade.quantity)
                holding.units_held = remaining_units
                holding.current_value = round(remaining_units * (holding.nav_per_unit or exec_price), 2)
            portfolio.cash_balance = (portfolio.cash_balance or 0.0) + trade.estimated_value

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
        message=f"Trade approved by {trade.client_id}: {trade.action.value} {trade.asset_code} ({trade.quantity} units). Settling now.",
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
        message=f"Trade rejected by client: {trade.action.value} {trade.asset_code}. Reason: {trade.client_comment or 'None'}",
    )

    db.commit()
    db.refresh(trade)

    return trade


@router.get("/advisor/pipeline")
def advisor_pipeline(
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    """Aggregate trade counts by workflow stage for the advisor's entire book."""
    stage_map = {
        "Intake": "draft",
        "Review": "under_review",
        "Proposed": "proposed",
        "Awaiting": "pending_approval",
        "Compliance": "compliance_check",
        "Done": "approved",
    }
    client_ids = db.execute(
        text("SELECT id FROM clients WHERE advisor_id = :aid"),
        {"aid": current_advisor.id},
    ).fetchall()
    cids = [r[0] for r in client_ids]
    if not cids:
        return {stage: 0 for stage in stage_map}

    rows = db.execute(
        text("SELECT status, COUNT(*) FROM trades WHERE client_id = ANY(:cids) GROUP BY status"),
        {"cids": cids},
    ).fetchall()
    status_counts = {r[0]: r[1] for r in rows}
    return {stage: status_counts.get(db_status, 0) for stage, db_status in stage_map.items()}


@router.get("/clients/{client_id}/trades", response_model=List[schemas.TradeOut])
def list_advisor_trades(
    client_id: int,
    db: Session = Depends(get_db),
    current_advisor=Depends(get_current_advisor_user),
):
    """Advisor views all trades for a client."""
    client = db.query(models.Client).filter(
        models.Client.id == client_id,
        models.Client.advisor_id == current_advisor.id
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
    current_user=Depends(get_current_personal_user),
):
    """Client views their trades (ARIA Personal perspective)."""
    resolved_client_id = _get_client_id_for_personal_user(current_user.id, db)
    if not resolved_client_id or resolved_client_id != client_id:
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


# ─── Client-Initiated Trade (FEAT-CLIENT-TRADE) ──────────────────────────────

def _get_portfolio_for_personal_user(personal_user_id: int, db: Session):
    """Resolve Portfolio ORM object for a personal user."""
    return db.query(models.Portfolio).filter(
        models.Portfolio.personal_user_id == personal_user_id
    ).first()


def _get_advisor_id_for_personal_user(personal_user_id: int, db: Session) -> Optional[int]:
    """Resolve advisor_id from personal_users table."""
    row = db.execute(
        text("SELECT advisor_id FROM personal_users WHERE id = :uid LIMIT 1"),
        {"uid": personal_user_id},
    ).fetchone()
    return row[0] if row else None


def _check_buy_balance(portfolio: models.Portfolio, estimated_value: float) -> dict:
    available = portfolio.cash_balance or 0.0
    sufficient = available >= estimated_value
    return {"sufficient": sufficient, "available": available, "required": estimated_value, "shortfall": max(0.0, estimated_value - available)}


def _check_sell_balance(portfolio: models.Portfolio, asset_code: str, quantity: float) -> dict:
    holding = next(
        (h for h in portfolio.holdings if h.asset_code and h.asset_code.upper() == asset_code.upper()),
        None,
    )
    available = holding.units_held if (holding and holding.units_held is not None) else 0.0
    sufficient = available >= quantity
    return {"sufficient": sufficient, "available": available, "required": quantity, "shortfall": max(0.0, quantity - available)}


@router.get("/personal/me/balance-check", response_model=schemas.BalanceCheckOut)
def client_balance_check(
    action: str,
    asset_code: str,
    quantity: float,
    estimated_value: float,
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Pre-approve balance check for client.
    action=buy  → checks cash_balance >= estimated_value
    action=sell → checks units_held of asset_code >= quantity
    """
    if not x_personal_user_id:
        raise HTTPException(status_code=401, detail="X-Personal-User-Id header required")
    portfolio = _get_portfolio_for_personal_user(x_personal_user_id, db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if action == "buy":
        result = _check_buy_balance(portfolio, estimated_value)
    elif action == "sell":
        result = _check_sell_balance(portfolio, asset_code, quantity)
    else:
        raise HTTPException(status_code=400, detail="action must be buy or sell")

    return schemas.BalanceCheckOut(**result)


@router.post("/personal/me/trades", response_model=schemas.TradeOut, status_code=201)
def client_submit_trade(
    trade_data: schemas.ClientTradeCreate,
    db: Session = Depends(get_db),
    x_personal_user_id: int = Header(None, alias="X-Personal-User-Id"),
):
    """
    Client initiates a trade.
    - Requires advisor linked (403 if none).
    - Validates balance: buy → cash_balance; sell → units_held.
    - Creates trade as settled immediately + notifies advisor.
    - Deducts cash (buy) or units (sell) from portfolio.
    """
    if not x_personal_user_id:
        raise HTTPException(status_code=401, detail="X-Personal-User-Id header required")

    advisor_id = _get_advisor_id_for_personal_user(x_personal_user_id, db)
    # No advisor = trade still processes, notification skipped

    client_id = _get_client_id_for_personal_user(x_personal_user_id, db)
    if not client_id:
        raise HTTPException(status_code=404, detail="No client record found for this user")

    portfolio = _get_portfolio_for_personal_user(x_personal_user_id, db)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    _validate_min_quantity(trade_data.asset_type, trade_data.quantity)

    # Balance check
    if trade_data.action == "buy":
        check = _check_buy_balance(portfolio, trade_data.estimated_value)
        if not check["sufficient"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient cash balance. Available: ₹{check['available']:,.0f}, Required: ₹{check['required']:,.0f}"
            )
    elif trade_data.action == "sell":
        check = _check_sell_balance(portfolio, trade_data.asset_code, trade_data.quantity)
        if not check["sufficient"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient holdings. Available: {check['available']} units, Required: {check['required']} units of {trade_data.asset_code}"
            )
    else:
        raise HTTPException(status_code=400, detail="action must be buy or sell")

    now = datetime.utcnow()

    # Create trade directly as settled
    trade = models.Trade(
        client_id=client_id,
        advisor_id=advisor_id,
        asset_type=trade_data.asset_type,
        action=trade_data.action,
        asset_code=trade_data.asset_code,
        quantity=trade_data.quantity,
        estimated_value=trade_data.estimated_value,
        actual_value=trade_data.estimated_value,
        status=models.TradeStatusEnum.settled,
        client_comment=trade_data.client_note,
        submitted_at=now,
        approved_at=now,
        executed_at=now,
        settled_at=now,
    )
    db.add(trade)
    db.flush()

    # Audit logs
    db.add(models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.created,
        actor=models.TradeActorEnum.client,
        note=f"Client-initiated: {trade_data.action} {trade_data.asset_code} {trade_data.quantity} units",
    ))
    db.add(models.TradeAuditLog(
        trade_id=trade.id,
        action=models.TradeAuditActionEnum.settled,
        actor=models.TradeActorEnum.system,
        note="Auto-settled on client submission",
    ))

    # Update portfolio balances
    exec_price = trade_data.estimated_value / trade_data.quantity if trade_data.quantity else 0.0
    trade.execution_price = exec_price

    if trade_data.action == "buy":
        portfolio.cash_balance = (portfolio.cash_balance or 0.0) - trade_data.estimated_value
        holding = next(
            (h for h in portfolio.holdings if h.asset_code and h.asset_code.upper() == trade_data.asset_code.upper()),
            None,
        )
        if holding:
            old_units = holding.units_held or 0.0
            old_avg = holding.avg_purchase_price or exec_price
            new_units = old_units + trade_data.quantity
            holding.avg_purchase_price = round(((old_units * old_avg) + (trade_data.quantity * exec_price)) / new_units, 4) if new_units else exec_price
            holding.units_held = new_units
            holding.nav_per_unit = exec_price
            holding.price_per_unit = exec_price
            holding.current_value = round(new_units * exec_price, 2)
        else:
            db.add(models.Holding(
                portfolio_id=portfolio.id,
                asset_type=trade_data.asset_type,
                asset_code=trade_data.asset_code,
                fund_name=trade_data.asset_code,
                current_value=trade_data.estimated_value,
                target_pct=0.0,
                current_pct=0.0,
                units_held=trade_data.quantity,
                nav_per_unit=exec_price,
                price_per_unit=exec_price,
                avg_purchase_price=exec_price,
            ))
    else:  # sell — avg_purchase_price unchanged (cost basis stays)
        holding = next(
            (h for h in portfolio.holdings if h.asset_code and h.asset_code.upper() == trade_data.asset_code.upper()),
            None,
        )
        if holding:
            holding.units_held = max(0.0, (holding.units_held or 0.0) - trade_data.quantity)
            holding.current_value = max(0.0, holding.units_held * (holding.nav_per_unit or exec_price))
        portfolio.cash_balance = (portfolio.cash_balance or 0.0) + trade_data.estimated_value

    # Notify advisor
    create_notification(
        db=db,
        advisor_id=advisor_id,
        notification_type=models.NotificationTypeEnum.trade_client_submitted.value,
        trade_id=trade.id,
        message=f"Client trade: {trade_data.action.upper()} {trade_data.asset_code} — {trade_data.quantity} units @ ₹{trade_data.estimated_value:,.0f}",
    )

    db.commit()
    db.refresh(trade)
    return trade
