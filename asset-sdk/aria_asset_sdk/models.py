from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class AssetType(str, Enum):
    crypto = "crypto"
    stock = "stock"
    mutual_fund = "mutual_fund"
    bond = "bond"
    commodity = "commodity"
    forex = "forex"


class ConnectionStatus(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"


class TransactionAction(str, Enum):
    buy = "buy"
    sell = "sell"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"


class TransactionStatus(str, Enum):
    pending = "pending"
    executed = "executed"
    failed = "failed"
    cancelled = "cancelled"


class WebhookEventType(str, Enum):
    price_update = "price_update"
    transaction_confirmed = "transaction_confirmed"
    transaction_failed = "transaction_failed"
    account_connected = "account_connected"
    account_disconnected = "account_disconnected"


@dataclass
class ConnectionResult:
    status: ConnectionStatus
    account_ref: str
    provider: str
    asset_type: AssetType
    connected_at: datetime = field(default_factory=datetime.utcnow)
    message: Optional[str] = None


@dataclass
class AssetAccount:
    account_id: str
    provider: str
    asset_type: AssetType
    label: str
    currency: str
    connected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AssetHolding:
    account_id: str
    asset_type: AssetType
    asset_code: str       # ticker / ISIN / symbol
    asset_name: str
    units_held: float
    price_per_unit: float # in INR
    current_value: float  # units_held * price_per_unit
    category: Optional[str] = None  # Large Cap / DeFi / etc.
    provider: Optional[str] = None
    as_of: datetime = field(default_factory=datetime.utcnow)


@dataclass
class TransactionRequest:
    account_id: str
    asset_type: AssetType
    action: TransactionAction
    asset_code: str
    quantity: float
    estimated_value: float


@dataclass
class AssetTransaction:
    transaction_id: str
    account_id: str
    asset_type: AssetType
    action: TransactionAction
    asset_code: str
    quantity: float
    executed_value: float
    status: TransactionStatus
    executed_at: datetime = field(default_factory=datetime.utcnow)
    tx_hash: Optional[str] = None  # crypto only
    failure_reason: Optional[str] = None


@dataclass
class WebhookEvent:
    event_id: str
    event_type: WebhookEventType
    account_id: str
    asset_type: AssetType
    payload: dict
    occurred_at: datetime = field(default_factory=datetime.utcnow)
