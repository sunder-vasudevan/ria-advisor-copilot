"""Provider registry — swap mock for real by changing one line."""
from .base import AssetProvider
from .mock_provider import MockUnifiedProvider


def get_provider(
    latency_ms: int = 0,
    failure_rate: float = 0.0,
    scenario: str = "normal",
) -> AssetProvider:
    """Return the active provider. Replace MockUnifiedProvider with real SDK here."""
    return MockUnifiedProvider(
        latency_ms=latency_ms,
        failure_rate=failure_rate,
        scenario=scenario,
    )
