import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import services
from models import Account
from services import transfer, accounts_db, transactions_db


def _reset():
    accounts_db.clear()
    accounts_db["acc-1"] = Account(id="acc-1", name="Alice", balance=1000.0)
    accounts_db["acc-2"] = Account(id="acc-2", name="Bob", balance=500.0)
    transactions_db.clear()
    services._next_tx_id = 1


def test_transfer_success():
    _reset()
    tx = transfer("acc-1", "acc-2", 200.0, "test transfer")
    assert tx.kind == "transfer"
    assert tx.amount == 200.0
    assert accounts_db["acc-1"].balance == 800.0
    assert accounts_db["acc-2"].balance == 700.0


def test_transfer_insufficient():
    _reset()
    try:
        transfer("acc-1", "acc-2", 5000.0, "too much")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Insufficient" in str(e) or "insufficient" in str(e).lower()


def test_transfer_nonexistent_source():
    _reset()
    try:
        transfer("acc-999", "acc-2", 100.0, "bad source")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass


def test_transfer_nonexistent_target():
    _reset()
    try:
        transfer("acc-1", "acc-999", 100.0, "bad target")
        assert False, "Should have raised ValueError"
    except ValueError:
        pass
