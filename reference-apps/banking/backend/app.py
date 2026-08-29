from fastapi import FastAPI, HTTPException
from models import WithdrawRequest, DepositRequest, TransferRequest
from services import (
    list_accounts,
    get_account,
    withdraw,
    deposit,
    transfer,
    get_transactions,
)

app = FastAPI(title="Banking Reference App", version="0.1.0")


@app.get("/accounts")
def list_all_accounts():
    return list_accounts()


@app.get("/accounts/{account_id}")
def get_account_by_id(account_id: str):
    account = get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@app.post("/accounts/{account_id}/withdraw")
def withdraw_from_account(account_id: str, req: WithdrawRequest):
    account = get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    try:
        tx = withdraw(account_id, req.amount, req.description)
        return tx
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/accounts/{account_id}/deposit")
def deposit_to_account(account_id: str, req: DepositRequest):
    account = get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    try:
        tx = deposit(account_id, req.amount, req.description)
        return tx
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/transfer")
def transfer_between_accounts(req: TransferRequest):
    try:
        tx = transfer(req.from_account_id, req.to_account_id, req.amount, req.description)
        return tx
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/accounts/{account_id}/transactions")
def list_account_transactions(account_id: str):
    account = get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return get_transactions(account_id)
