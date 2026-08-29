from pydantic import BaseModel


class Account(BaseModel):
    id: str
    name: str
    balance: float
    currency: str = "USD"


class Transaction(BaseModel):
    id: str
    account_id: str
    kind: str
    amount: float
    description: str = ""


class WithdrawRequest(BaseModel):
    amount: float
    description: str = ""


class DepositRequest(BaseModel):
    amount: float
    description: str = ""


class TransferRequest(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: float
    description: str = ""
