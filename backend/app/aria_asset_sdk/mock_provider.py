"""
MockUnifiedProvider — deterministic fake data for all asset types.

Configurable:
  latency_ms    : int   — simulated response delay (default 0)
  failure_rate  : float — probability 0.0–1.0 of raising SimulatedNetworkError
  scenario      : str   — "normal" | "market_crash" | "network_timeout"
"""

import hashlib
import random
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from .base import AssetProvider
from .exceptions import AuthError, SimulatedNetworkError, TransactionError
from .models import (
    AssetAccount,
    AssetHolding,
    AssetTransaction,
    AssetType,
    ConnectionResult,
    ConnectionStatus,
    TransactionAction,
    TransactionRequest,
    TransactionStatus,
    WebhookEvent,
    WebhookEventType,
)

# ── Seed data per asset type ────────────────────────────────────────────────

_HOLDINGS_SEED: Dict[AssetType, List[dict]] = {
    AssetType.crypto: [
        {"code": "BTC", "name": "Bitcoin", "units": 0.45, "price": 5800000, "category": "Layer 1"},
        {"code": "ETH", "name": "Ethereum", "units": 3.2, "price": 310000, "category": "Layer 1"},
        {"code": "SOL", "name": "Solana", "units": 12.0, "price": 14500, "category": "Layer 1"},
    ],
    AssetType.stock: [
        {"code": "RELIANCE", "name": "Reliance Industries", "units": 50, "price": 2950, "category": "Energy"},
        {"code": "TCS", "name": "Tata Consultancy Services", "units": 30, "price": 3900, "category": "IT"},
        {"code": "HDFC", "name": "HDFC Bank", "units": 80, "price": 1620, "category": "Banking"},
        {"code": "INFY", "name": "Infosys", "units": 60, "price": 1550, "category": "IT"},
    ],
    AssetType.mutual_fund: [
        {"code": "INF204K01P44", "name": "Mirae Asset Large Cap Fund", "units": 200, "price": 98.5, "category": "Large Cap"},
        {"code": "INF179K01BB8", "name": "HDFC Flexi Cap Fund", "units": 350, "price": 142.3, "category": "Flexi Cap"},
        {"code": "INF109K01Z87", "name": "Axis Small Cap Fund", "units": 500, "price": 72.1, "category": "Small Cap"},
    ],
    AssetType.bond: [
        {"code": "IN0020210121", "name": "GOI 6.79% 2027", "units": 100, "price": 10050, "category": "Government"},
        {"code": "IN0020200085", "name": "REC 7.15% 2025", "units": 50, "price": 10120, "category": "PSU"},
    ],
    AssetType.commodity: [
        {"code": "GOLD", "name": "Gold (24K)", "units": 10, "price": 65000, "category": "Precious Metal"},
        {"code": "SILVER", "name": "Silver", "units": 500, "price": 780, "category": "Precious Metal"},
    ],
    AssetType.forex: [
        {"code": "USD/INR", "name": "US Dollar", "units": 1000, "price": 83.4, "category": "Major"},
        {"code": "EUR/INR", "name": "Euro", "units": 500, "price": 90.1, "category": "Major"},
    ],
}

_CRASH_MULTIPLIER = 0.65  # 35% drop in market_crash scenario


def _deterministic_seed(account_id: str) -> int:
    return int(hashlib.md5(account_id.encode()).hexdigest(), 16) % (2**31)


def _tx_hash(asset_code: str, account_id: str) -> str:
    raw = f"{asset_code}-{account_id}-{uuid.uuid4()}"
    return "0x" + hashlib.sha256(raw.encode()).hexdigest()


class MockUnifiedProvider(AssetProvider):
    def __init__(
        self,
        latency_ms: int = 0,
        failure_rate: float = 0.0,
        scenario: str = "normal",
    ):
        self.latency_ms = latency_ms
        self.failure_rate = failure_rate
        self.scenario = scenario
        self._connected = False
        self._credentials: dict = {}
        self._connected_at: Optional[datetime] = None

    # ── Internal helpers ────────────────────────────────────────────────────

    def _maybe_fail(self):
        if self.scenario == "network_timeout":
            raise SimulatedNetworkError()
        if self.failure_rate > 0 and random.random() < self.failure_rate:
            raise SimulatedNetworkError()

    def _sleep(self):
        if self.latency_ms > 0:
            time.sleep(self.latency_ms / 1000)

    def _price(self, base_price: float) -> float:
        if self.scenario == "market_crash":
            return round(base_price * _CRASH_MULTIPLIER, 2)
        return base_price

    # ── AssetProvider interface ──────────────────────────────────────────────

    def connect(self, credentials: dict) -> ConnectionResult:
        self._sleep()
        self._maybe_fail()

        api_key = credentials.get("api_key", "")
        if not api_key or api_key == "invalid":
            raise AuthError("Invalid API key")

        self._connected = True
        self._credentials = credentials
        self._connected_at = datetime.utcnow()
        asset_type = AssetType(credentials.get("asset_type", "stock"))

        return ConnectionResult(
            status=ConnectionStatus.connected,
            account_ref=credentials.get("account_ref", f"MOCK-{asset_type.value.upper()}-001"),
            provider="mock_provider",
            asset_type=asset_type,
            connected_at=self._connected_at,
            message="Mock connection established",
        )

    def get_accounts(self) -> List[AssetAccount]:
        self._sleep()
        self._maybe_fail()

        accounts = []
        for asset_type in AssetType:
            accounts.append(
                AssetAccount(
                    account_id=f"MOCK-{asset_type.value.upper()}-001",
                    provider="mock_provider",
                    asset_type=asset_type,
                    label=f"Mock {asset_type.value.replace('_', ' ').title()} Account",
                    currency="INR",
                    connected_at=self._connected_at or datetime.utcnow(),
                )
            )
        return accounts

    def get_holdings(self, account_id: str) -> List[AssetHolding]:
        self._sleep()
        self._maybe_fail()

        # Derive asset_type from account_id (e.g. "MOCK-CRYPTO-001")
        parts = account_id.split("-")
        if len(parts) >= 2:
            try:
                asset_type = AssetType(parts[1].lower())
            except ValueError:
                asset_type = AssetType.stock
        else:
            asset_type = AssetType.stock

        seeds = _HOLDINGS_SEED.get(asset_type, [])
        rng = random.Random(_deterministic_seed(account_id))

        holdings = []
        for s in seeds:
            # Small deterministic jitter on price
            jitter = 1 + rng.uniform(-0.02, 0.02)
            price = self._price(round(s["price"] * jitter, 2))
            units = s["units"]
            holdings.append(
                AssetHolding(
                    account_id=account_id,
                    asset_type=asset_type,
                    asset_code=s["code"],
                    asset_name=s["name"],
                    units_held=units,
                    price_per_unit=price,
                    current_value=round(units * price, 2),
                    category=s.get("category"),
                    provider="mock_provider",
                    as_of=datetime.utcnow(),
                )
            )
        return holdings

    def execute_transaction(self, request: TransactionRequest) -> AssetTransaction:
        self._sleep()
        self._maybe_fail()

        if request.quantity <= 0:
            raise TransactionError("Quantity must be positive")
        if request.estimated_value <= 0:
            raise TransactionError("Estimated value must be positive")

        tx_id = str(uuid.uuid4())
        tx_hash = (
            _tx_hash(request.asset_code, request.account_id)
            if request.asset_type == AssetType.crypto
            else None
        )

        return AssetTransaction(
            transaction_id=tx_id,
            account_id=request.account_id,
            asset_type=request.asset_type,
            action=request.action,
            asset_code=request.asset_code,
            quantity=request.quantity,
            executed_value=round(request.estimated_value * random.uniform(0.995, 1.005), 2),
            status=TransactionStatus.executed,
            executed_at=datetime.utcnow(),
            tx_hash=tx_hash,
        )

    def get_transaction_history(self, account_id: str) -> List[AssetTransaction]:
        self._sleep()
        self._maybe_fail()

        rng = random.Random(_deterministic_seed(account_id))
        parts = account_id.split("-")
        try:
            asset_type = AssetType(parts[1].lower()) if len(parts) >= 2 else AssetType.stock
        except ValueError:
            asset_type = AssetType.stock

        seeds = _HOLDINGS_SEED.get(asset_type, [])
        history = []
        for i, s in enumerate(seeds[:3]):
            action = TransactionAction.buy if i % 2 == 0 else TransactionAction.sell
            qty = round(rng.uniform(1, 10), 4)
            price = self._price(s["price"])
            history.append(
                AssetTransaction(
                    transaction_id=str(uuid.UUID(int=rng.getrandbits(128))),
                    account_id=account_id,
                    asset_type=asset_type,
                    action=action,
                    asset_code=s["code"],
                    quantity=qty,
                    executed_value=round(qty * price, 2),
                    status=TransactionStatus.executed,
                    executed_at=datetime.utcnow() - timedelta(days=i * 7),
                    tx_hash=_tx_hash(s["code"], account_id) if asset_type == AssetType.crypto else None,
                )
            )
        return history

    def emit_webhook(self, event_type: WebhookEventType, account_id: str) -> WebhookEvent:
        self._sleep()

        parts = account_id.split("-")
        try:
            asset_type = AssetType(parts[1].lower()) if len(parts) >= 2 else AssetType.stock
        except ValueError:
            asset_type = AssetType.stock

        seeds = _HOLDINGS_SEED.get(asset_type, [])
        sample = seeds[0] if seeds else {"code": "UNKNOWN", "price": 0}

        payload: dict = {
            "asset_code": sample["code"],
            "account_id": account_id,
        }
        if event_type == WebhookEventType.price_update:
            payload["new_price"] = self._price(sample["price"])
            payload["change_pct"] = -35.0 if self.scenario == "market_crash" else round(random.uniform(-2, 2), 2)
        elif event_type == WebhookEventType.transaction_confirmed:
            payload["transaction_id"] = str(uuid.uuid4())
            payload["quantity"] = 1.0
            payload["value"] = self._price(sample["price"])

        return WebhookEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            account_id=account_id,
            asset_type=asset_type,
            payload=payload,
            occurred_at=datetime.utcnow(),
        )

    def disconnect(self) -> None:
        self._connected = False
        self._credentials = {}
        self._connected_at = None
