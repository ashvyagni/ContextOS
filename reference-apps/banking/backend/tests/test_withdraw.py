import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import services
from models import Account
from services import withdraw, accounts_db, transactions_db


def _reset():
    accounts_db.clear()
    accounts_db["acc-1"] = Account(id="acc-1", name="Alice", balance=1000.0)
    accounts_db["acc-2"] = Account(id="acc-2", name="Bob", balance=500.0)
    transactions_db.clear()
    services._next_tx_id = 1


def test_withdraw_success():
    _reset()
    tx = withdraw("acc-1", 100.0, "test withdrawal")
    assert tx.kind == "withdraw"
    assert tx.amount == 100.0
    assert accounts_db["acc-1"].balance == 900.0


def test_withdraw_insufficient():
    _reset()
    try:
        withdraw("acc-1", 2000.0, "too much")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Insufficient" in str(e) or "insufficient" in str(e).lower()


def test_withdraw_negative():
    _reset()
    try:
        withdraw("acc-1", -50.0, "negative")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_withdraw_all():
    _reset()
    tx = withdraw("acc-1", 1000.0, "withdraw all")
    assert accounts_db["acc-1"].balance == 0.0
    assert tx.amount == 1000.0
