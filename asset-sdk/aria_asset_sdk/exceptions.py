class SDKError(Exception):
    """Base SDK error."""
    def __init__(self, message: str, code: str = "SDK_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class ConnectionError(SDKError):
    def __init__(self, message: str):
        super().__init__(message, "CONNECTION_ERROR")


class AuthError(SDKError):
    def __init__(self, message: str):
        super().__init__(message, "AUTH_ERROR")


class AccountNotFoundError(SDKError):
    def __init__(self, account_id: str):
        super().__init__(f"Account not found: {account_id}", "ACCOUNT_NOT_FOUND")


class TransactionError(SDKError):
    def __init__(self, message: str):
        super().__init__(message, "TRANSACTION_ERROR")


class SimulatedNetworkError(SDKError):
    def __init__(self):
        super().__init__("Simulated network timeout", "NETWORK_TIMEOUT")
