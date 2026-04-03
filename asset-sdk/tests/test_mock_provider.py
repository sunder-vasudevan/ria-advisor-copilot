import pytest
from aria_asset_sdk import (
    AssetType,
    ConnectionStatus,
    MockUnifiedProvider,
    TransactionAction,
    TransactionRequest,
    TransactionStatus,
    WebhookEventType,
)
from aria_asset_sdk.exceptions import AuthError, SimulatedNetworkError, TransactionError


@pytest.fixture
def provider():
    return MockUnifiedProvider()


@pytest.fixture
def connected_provider():
    p = MockUnifiedProvider()
    p.connect({"api_key": "mock-key", "asset_type": "stock", "account_ref": "TEST-001"})
    return p


# ── connect ──────────────────────────────────────────────────────────────────

def test_connect_success(provider):
    result = provider.connect({"api_key": "mock-key", "asset_type": "crypto", "account_ref": "MOCK-CRYPTO-001"})
    assert result.status == ConnectionStatus.connected
    assert result.asset_type == AssetType.crypto
    assert result.provider == "mock_provider"


def test_connect_invalid_key_raises(provider):
    with pytest.raises(AuthError):
        provider.connect({"api_key": "invalid"})


def test_connect_missing_key_raises(provider):
    with pytest.raises(AuthError):
        provider.connect({})


# ── get_accounts ─────────────────────────────────────────────────────────────

def test_get_accounts_returns_all_asset_types(connected_provider):
    accounts = connected_provider.get_accounts()
    types = {a.asset_type for a in accounts}
    assert types == set(AssetType)


# ── get_holdings ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("account_id,expected_type", [
    ("MOCK-CRYPTO-001", AssetType.crypto),
    ("MOCK-STOCK-001", AssetType.stock),
    ("MOCK-MUTUAL_FUND-001", AssetType.mutual_fund),
    ("MOCK-BOND-001", AssetType.bond),
    ("MOCK-COMMODITY-001", AssetType.commodity),
    ("MOCK-FOREX-001", AssetType.forex),
])
def test_get_holdings_asset_types(provider, account_id, expected_type):
    holdings = provider.get_holdings(account_id)
    assert len(holdings) > 0
    for h in holdings:
        assert h.asset_type == expected_type
        assert h.units_held > 0
        assert h.price_per_unit > 0
        assert h.current_value == pytest.approx(h.units_held * h.price_per_unit, rel=1e-3)


def test_get_holdings_deterministic(provider):
    h1 = provider.get_holdings("MOCK-STOCK-001")
    h2 = provider.get_holdings("MOCK-STOCK-001")
    assert [h.price_per_unit for h in h1] == [h.price_per_unit for h in h2]


def test_get_holdings_market_crash_scenario():
    p = MockUnifiedProvider(scenario="market_crash")
    normal = MockUnifiedProvider()
    crash_holdings = p.get_holdings("MOCK-CRYPTO-001")
    normal_holdings = normal.get_holdings("MOCK-CRYPTO-001")
    for c, n in zip(crash_holdings, normal_holdings):
        assert c.price_per_unit < n.price_per_unit


# ── execute_transaction ───────────────────────────────────────────────────────

def test_execute_transaction_success(provider):
    req = TransactionRequest(
        account_id="MOCK-STOCK-001",
        asset_type=AssetType.stock,
        action=TransactionAction.buy,
        asset_code="TCS",
        quantity=5,
        estimated_value=19500,
    )
    txn = provider.execute_transaction(req)
    assert txn.status == TransactionStatus.executed
    assert txn.asset_code == "TCS"
    assert txn.tx_hash is None  # not crypto


def test_execute_crypto_transaction_has_tx_hash(provider):
    req = TransactionRequest(
        account_id="MOCK-CRYPTO-001",
        asset_type=AssetType.crypto,
        action=TransactionAction.buy,
        asset_code="BTC",
        quantity=0.01,
        estimated_value=58000,
    )
    txn = provider.execute_transaction(req)
    assert txn.tx_hash is not None
    assert txn.tx_hash.startswith("0x")


def test_execute_transaction_zero_quantity_raises(provider):
    req = TransactionRequest(
        account_id="MOCK-STOCK-001",
        asset_type=AssetType.stock,
        action=TransactionAction.buy,
        asset_code="TCS",
        quantity=0,
        estimated_value=0,
    )
    with pytest.raises(TransactionError):
        provider.execute_transaction(req)


# ── get_transaction_history ───────────────────────────────────────────────────

def test_get_transaction_history_returns_records(provider):
    history = provider.get_transaction_history("MOCK-STOCK-001")
    assert len(history) > 0
    for txn in history:
        assert txn.status == TransactionStatus.executed


# ── emit_webhook ─────────────────────────────────────────────────────────────

def test_emit_webhook_price_update(provider):
    event = provider.emit_webhook(WebhookEventType.price_update, "MOCK-CRYPTO-001")
    assert event.event_type == WebhookEventType.price_update
    assert "new_price" in event.payload
    assert "change_pct" in event.payload


def test_emit_webhook_transaction_confirmed(provider):
    event = provider.emit_webhook(WebhookEventType.transaction_confirmed, "MOCK-STOCK-001")
    assert event.event_type == WebhookEventType.transaction_confirmed
    assert "transaction_id" in event.payload


# ── failure simulation ────────────────────────────────────────────────────────

def test_network_timeout_scenario_raises():
    p = MockUnifiedProvider(scenario="network_timeout")
    with pytest.raises(SimulatedNetworkError):
        p.get_holdings("MOCK-STOCK-001")


def test_failure_rate_1_always_raises():
    p = MockUnifiedProvider(failure_rate=1.0)
    with pytest.raises(SimulatedNetworkError):
        p.get_holdings("MOCK-STOCK-001")


def test_failure_rate_0_never_raises():
    p = MockUnifiedProvider(failure_rate=0.0)
    # Should not raise
    p.get_holdings("MOCK-STOCK-001")


# ── disconnect ────────────────────────────────────────────────────────────────

def test_disconnect(connected_provider):
    connected_provider.disconnect()
    assert connected_provider._connected is False
