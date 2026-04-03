from abc import ABC, abstractmethod
from typing import List

from .models import (
    AssetAccount,
    AssetHolding,
    AssetTransaction,
    ConnectionResult,
    TransactionRequest,
    WebhookEvent,
    WebhookEventType,
)


class AssetProvider(ABC):
    """Abstract interface for all asset providers (mock or real)."""

    @abstractmethod
    def connect(self, credentials: dict) -> ConnectionResult:
        """Authenticate and connect to provider. Returns ConnectionResult."""

    @abstractmethod
    def get_accounts(self) -> List[AssetAccount]:
        """List all accounts/wallets linked to this provider."""

    @abstractmethod
    def get_holdings(self, account_id: str) -> List[AssetHolding]:
        """Fetch current holdings for an account."""

    @abstractmethod
    def execute_transaction(self, request: TransactionRequest) -> AssetTransaction:
        """Submit a buy/sell/transfer. Returns AssetTransaction."""

    @abstractmethod
    def get_transaction_history(self, account_id: str) -> List[AssetTransaction]:
        """Fetch past transactions for an account."""

    @abstractmethod
    def emit_webhook(self, event_type: WebhookEventType, account_id: str) -> WebhookEvent:
        """Simulate an on-chain or broker event callback."""

    @abstractmethod
    def disconnect(self) -> None:
        """Close connection to provider."""
