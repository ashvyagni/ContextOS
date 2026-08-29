from models import Account, Transaction


accounts_db: dict[str, Account] = {
    "acc-1": Account(id="acc-1", name="Alice", balance=1000.0),
    "acc-2": Account(id="acc-2", name="Bob", balance=500.0),
}

transactions_db: list[Transaction] = []
_next_tx_id = 1


def get_account(account_id: str) -> Account | None:
    return accounts_db.get(account_id)


def list_accounts() -> list[Account]:
    return list(accounts_db.values())


def withdraw(account_id: str, amount: float, description: str = "") -> Transaction:
    account = accounts_db[account_id]
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if account.balance < amount:
        raise ValueError("Insufficient funds")
    account.balance -= amount
    global _next_tx_id
    tx = Transaction(
        id=f"tx-{_next_tx_id}",
        account_id=account_id,
        kind="withdraw",
        amount=amount,
        description=description,
    )
    _next_tx_id += 1
    transactions_db.append(tx)
    return tx


def deposit(account_id: str, amount: float, description: str = "") -> Transaction:
    account = accounts_db[account_id]
    if amount <= 0:
        raise ValueError("Amount must be positive")
    account.balance += amount
    global _next_tx_id
    tx = Transaction(
        id=f"tx-{_next_tx_id}",
        account_id=account_id,
        kind="deposit",
        amount=amount,
        description=description,
    )
    _next_tx_id += 1
    transactions_db.append(tx)
    return tx


def transfer(
    from_id: str, to_id: str, amount: float, description: str = ""
) -> Transaction:
    if from_id not in accounts_db:
        raise ValueError("Source account not found")
    if to_id not in accounts_db:
        raise ValueError("Target account not found")
    withdraw(from_id, amount, description)
    deposit(to_id, amount, description)
    global _next_tx_id
    tx = Transaction(
        id=f"tx-{_next_tx_id}",
        account_id=from_id,
        kind="transfer",
        amount=amount,
        description=description or f"Transfer to {to_id}",
    )
    _next_tx_id += 1
    transactions_db.append(tx)
    return tx


def get_transactions(account_id: str) -> list[Transaction]:
    return [tx for tx in transactions_db if tx.account_id == account_id]
