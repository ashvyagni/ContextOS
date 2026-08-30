import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import services
from models import Account
from services import deposit, accounts_db, transactions_db


def _reset():
    accounts_db.clear()
    accounts_db["acc-1"] = Account(id="acc-1", name="Alice", balance=1000.0)
    accounts_db["acc-2"] = Account(id="acc-2", name="Bob", balance=500.0)
    transactions_db.clear()
    services._next_tx_id = 1


def test_deposit_success():
    _reset()
    tx = deposit("acc-1", 200.0, "test deposit")
    assert tx.kind == "deposit"
    assert tx.amount == 200.0
    assert accounts_db["acc-1"].balance == 1200.0


def test_deposit_negative():
    _reset()
    try:
        deposit("acc-1", -50.0, "negative deposit")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_deposit_zero():
    _reset()
    try:
        deposit("acc-1", 0.0, "zero deposit")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass
