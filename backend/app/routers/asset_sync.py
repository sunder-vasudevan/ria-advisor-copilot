"""Asset Sync Router — Unified Asset SDK integration."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import SessionLocal
from .. import models, schemas
from ..aria_asset_sdk import (
    AssetType,
    TransactionAction,
    TransactionRequest,
    WebhookEventType,
    get_provider,
)
from ..aria_asset_sdk.exceptions import AuthError, SDKError, SimulatedNetworkError

router = APIRouter(prefix="/asset-sdk", tags=["asset-sdk"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_client_id_for_personal_user(personal_user_id: int, db: Session) -> Optional[int]:
    row = db.execute(
        text("SELECT client_id FROM portfolios WHERE personal_user_id = :uid LIMIT 1"),
        {"uid": personal_user_id}
    ).fetchone()
    return row[0] if row else None


def _resolve_owner(
    x_advisor_id: Optional[int],
    x_personal_user_id: Optional[int],
    x_client_id: Optional[int],
    db: Session,
) -> tuple[Optional[int], Optional[int]]:
    """Returns (client_id, personal_user_id)."""
    if x_personal_user_id:
        client_id = _get_client_id_for_personal_user(x_personal_user_id, db)
        return client_id, x_personal_user_id
    if x_client_id:
        return x_client_id, None
    return None, None


# ── POST /asset-sdk/connect ────────────────────────────────────────────────

@router.post("/connect", response_model=schemas.AssetAccountOut)
def connect_account(
    body: schemas.AssetAccountConnect,
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
    x_client_id: Optional[int] = Header(None, alias="X-Client-Id"),
):
    """
    Connect an asset provider account. Works for both Advisor and Personal users.
    Advisor: provide X-Client-Id or X-Advisor-Id.
    Personal: provide X-Personal-User-Id.
    """
    client_id, personal_user_id = _resolve_owner(x_advisor_id, x_personal_user_id, x_client_id, db)

    provider = get_provider()
    try:
        result = provider.connect({
            "api_key": body.api_key,
            "asset_type": body.asset_type,
            "account_ref": body.account_ref or f"MOCK-{body.asset_type.upper()}-001",
        })
    except AuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)
    except SDKError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=e.message)

    account = models.AssetAccount(
        client_id=client_id,
        personal_user_id=personal_user_id,
        provider=result.provider,
        account_ref=result.account_ref,
        asset_type=result.asset_type.value,
        label=f"{body.asset_type.replace('_', ' ').title()} Account",
        connected_at=result.connected_at,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


# ── GET /asset-sdk/accounts ────────────────────────────────────────────────

@router.get("/accounts", response_model=List[schemas.AssetAccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
    x_client_id: Optional[int] = Header(None, alias="X-Client-Id"),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
):
    """List connected asset accounts for the current user."""
    client_id, personal_user_id = _resolve_owner(x_advisor_id, x_personal_user_id, x_client_id, db)

    query = db.query(models.AssetAccount).filter(
        models.AssetAccount.disconnected_at.is_(None)
    )
    if personal_user_id:
        query = query.filter(models.AssetAccount.personal_user_id == personal_user_id)
    elif client_id:
        query = query.filter(models.AssetAccount.client_id == client_id)
    else:
        raise HTTPException(status_code=400, detail="No owner context provided")

    return query.all()


# ── GET /asset-sdk/holdings/{account_id} ─────────────────────────────────

@router.get("/holdings/{account_id}", response_model=List[schemas.AssetHoldingOut])
def get_holdings(
    account_id: str,
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
    x_client_id: Optional[int] = Header(None, alias="X-Client-Id"),
):
    """Fetch holdings for a connected account from the SDK."""
    provider = get_provider()
    try:
        holdings = provider.get_holdings(account_id)
    except SimulatedNetworkError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)
    except SDKError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=e.message)

    return [
        schemas.AssetHoldingOut(
            account_id=h.account_id,
            asset_type=h.asset_type.value,
            asset_code=h.asset_code,
            asset_name=h.asset_name,
            units_held=h.units_held,
            price_per_unit=h.price_per_unit,
            current_value=h.current_value,
            category=h.category,
            provider=h.provider,
            as_of=h.as_of,
        )
        for h in holdings
    ]


# ── POST /asset-sdk/holdings/{account_id}/sync ───────────────────────────

@router.post("/holdings/{account_id}/sync")
def sync_holdings_to_portfolio(
    account_id: str,
    db: Session = Depends(get_db),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
    x_client_id: Optional[int] = Header(None, alias="X-Client-Id"),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
):
    """
    Pull holdings from SDK and upsert into the portfolio holdings table.
    Replaces existing holdings for this asset type (full replace per type).
    """
    client_id, personal_user_id = _resolve_owner(x_advisor_id, x_personal_user_id, x_client_id, db)

    # Resolve portfolio
    query = db.query(models.Portfolio)
    if personal_user_id:
        query = query.filter(models.Portfolio.personal_user_id == personal_user_id)
    elif client_id:
        query = query.filter(models.Portfolio.client_id == client_id)
    else:
        raise HTTPException(status_code=400, detail="No owner context provided")

    portfolio = query.first()
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    # Derive asset_type from account_id
    parts = account_id.split("-")
    asset_type_str = parts[1].lower() if len(parts) >= 2 else "stock"

    provider = get_provider()
    try:
        sdk_holdings = provider.get_holdings(account_id)
    except SimulatedNetworkError as e:
        raise HTTPException(status_code=503, detail=e.message)
    except SDKError as e:
        raise HTTPException(status_code=502, detail=e.message)

    # Full replace for this asset type
    db.query(models.Holding).filter(
        models.Holding.portfolio_id == portfolio.id,
        models.Holding.asset_type == asset_type_str,
    ).delete()
    db.flush()

    total_synced_value = 0.0
    for h in sdk_holdings:
        holding = models.Holding(
            portfolio_id=portfolio.id,
            asset_type=h.asset_type.value,
            asset_code=h.asset_code,
            fund_name=h.asset_name,
            fund_category=h.category,
            fund_house=h.provider,
            current_value=h.current_value,
            target_pct=0.0,
            current_pct=0.0,
            units_held=h.units_held,
            price_per_unit=h.price_per_unit,
            nav_per_unit=h.price_per_unit,
        )
        db.add(holding)
        total_synced_value += h.current_value

    db.commit()
    return {"synced": len(sdk_holdings), "total_value": total_synced_value, "account_id": account_id}


# ── POST /asset-sdk/transactions ─────────────────────────────────────────

@router.post("/transactions", response_model=schemas.AssetTransactionOut)
def execute_transaction(
    body: schemas.AssetTransactionRequest,
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
):
    """Submit a buy/sell/transfer via the SDK."""
    try:
        asset_type = AssetType(body.asset_type)
        action = TransactionAction(body.action)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    provider = get_provider()
    try:
        txn = provider.execute_transaction(
            TransactionRequest(
                account_id=body.account_id,
                asset_type=asset_type,
                action=action,
                asset_code=body.asset_code,
                quantity=body.quantity,
                estimated_value=body.estimated_value,
            )
        )
    except SDKError as e:
        raise HTTPException(status_code=502, detail=e.message)

    return schemas.AssetTransactionOut(
        transaction_id=txn.transaction_id,
        account_id=txn.account_id,
        asset_type=txn.asset_type.value,
        action=txn.action.value,
        asset_code=txn.asset_code,
        quantity=txn.quantity,
        executed_value=txn.executed_value,
        status=txn.status.value,
        executed_at=txn.executed_at,
        tx_hash=txn.tx_hash,
        failure_reason=txn.failure_reason,
    )


# ── GET /asset-sdk/transactions/{account_id} ─────────────────────────────

@router.get("/transactions/{account_id}", response_model=List[schemas.AssetTransactionOut])
def get_transaction_history(
    account_id: str,
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
):
    provider = get_provider()
    try:
        history = provider.get_transaction_history(account_id)
    except SDKError as e:
        raise HTTPException(status_code=502, detail=e.message)

    return [
        schemas.AssetTransactionOut(
            transaction_id=t.transaction_id,
            account_id=t.account_id,
            asset_type=t.asset_type.value,
            action=t.action.value,
            asset_code=t.asset_code,
            quantity=t.quantity,
            executed_value=t.executed_value,
            status=t.status.value,
            executed_at=t.executed_at,
            tx_hash=t.tx_hash,
            failure_reason=t.failure_reason,
        )
        for t in history
    ]


# ── POST /asset-sdk/webhook ───────────────────────────────────────────────

@router.post("/webhook", response_model=schemas.WebhookEventOut)
def emit_webhook(
    account_id: str,
    event_type: str = "price_update",
    db: Session = Depends(get_db),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
):
    """Simulate a webhook event from the provider."""
    try:
        evt_type = WebhookEventType(event_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown event_type: {event_type}")

    provider = get_provider()
    event = provider.emit_webhook(evt_type, account_id)
    return schemas.WebhookEventOut(
        event_id=event.event_id,
        event_type=event.event_type.value,
        account_id=event.account_id,
        asset_type=event.asset_type.value,
        payload=event.payload,
        occurred_at=event.occurred_at,
    )


# ── DELETE /asset-sdk/accounts/{account_id} ─────────────────────────────

@router.delete("/accounts/{account_id}")
def disconnect_account(
    account_id: int,
    db: Session = Depends(get_db),
    x_personal_user_id: Optional[int] = Header(None, alias="X-Personal-User-Id"),
    x_client_id: Optional[int] = Header(None, alias="X-Client-Id"),
    x_advisor_id: Optional[int] = Header(None, alias="X-Advisor-Id"),
):
    """Soft-disconnect an asset account (sets disconnected_at)."""
    account = db.query(models.AssetAccount).filter(models.AssetAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.disconnected_at = datetime.utcnow()
    db.commit()
    return {"disconnected": True, "account_id": account_id}
