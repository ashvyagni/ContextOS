"""Minimal Python fixture for testing the AST analyzer."""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Account(BaseModel):
    id: str
    balance: float


def get_account(account_id: str) -> Account | None:
    return Account(id=account_id, balance=100.0)


def validate_amount(amount: float) -> bool:
    return amount > 0


@app.get("/accounts")
def list_accounts():
    return [get_account("acc-1")]


@app.post("/accounts/{account_id}/withdraw")
def withdraw(account_id: str, amount: float):
    if not validate_amount(amount):
        raise ValueError("Invalid amount")
    account = get_account(account_id)
    return {"status": "ok"}


@app.post("/accounts/{account_id}/deposit")
def deposit(account_id: str, amount: float):
    account = get_account(account_id)
    return {"status": "ok"}
