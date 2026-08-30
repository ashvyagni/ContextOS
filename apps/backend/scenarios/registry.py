from __future__ import annotations

from typing import Any


SCENARIOS: dict[str, list[dict[str, Any]]] = {
    "banking": [
        {
            "id": "withdraw-success",
            "name": "Withdraw - Sufficient Funds",
            "behaviorId": "withdraw",
            "kind": "pytest",
            "entrypoint": "tests/test_withdraw.py::test_withdraw_success",
            "expectedOutcome": "Withdrawal succeeds, balance decreases",
        },
        {
            "id": "withdraw-insufficient",
            "name": "Withdraw - Insufficient Funds",
            "behaviorId": "withdraw",
            "kind": "pytest",
            "entrypoint": "tests/test_withdraw.py::test_withdraw_insufficient",
            "expectedOutcome": "Withdrawal rejected, ValueError raised",
        },
        {
            "id": "deposit-success",
            "name": "Deposit - Valid Amount",
            "behaviorId": "deposit",
            "kind": "pytest",
            "entrypoint": "tests/test_deposit.py::test_deposit_success",
            "expectedOutcome": "Deposit succeeds, balance increases",
        },
        {
            "id": "deposit-negative",
            "name": "Deposit - Negative Amount",
            "behaviorId": "deposit",
            "kind": "pytest",
            "entrypoint": "tests/test_deposit.py::test_deposit_negative",
            "expectedOutcome": "Deposit rejected, ValueError raised",
        },
        {
            "id": "transfer-success",
            "name": "Transfer - Between Accounts",
            "behaviorId": "transfer",
            "kind": "pytest",
            "entrypoint": "tests/test_transfer.py::test_transfer_success",
            "expectedOutcome": "Transfer succeeds, both balances update",
        },
        {
            "id": "transfer-insufficient",
            "name": "Transfer - Insufficient Funds",
            "behaviorId": "transfer",
            "kind": "pytest",
            "entrypoint": "tests/test_transfer.py::test_transfer_insufficient",
            "expectedOutcome": "Transfer rejected, ValueError raised",
        },
    ],
    "ecommerce": [
        {
            "id": "browse-products",
            "name": "Browse Products",
            "behaviorId": "product-browsing",
            "kind": "pytest",
            "entrypoint": "tests/test_products.py::test_list_products",
            "expectedOutcome": "Product list returned successfully",
        },
        {
            "id": "add-to-cart",
            "name": "Add Item to Cart",
            "behaviorId": "cart-management",
            "kind": "pytest",
            "entrypoint": "tests/test_cart.py::test_add_to_cart",
            "expectedOutcome": "Item added to cart successfully",
        },
        {
            "id": "checkout-flow",
            "name": "Complete Checkout",
            "behaviorId": "checkout",
            "kind": "pytest",
            "entrypoint": "tests/test_checkout.py::test_checkout_success",
            "expectedOutcome": "Checkout completes, order created",
        },
        {
            "id": "login-valid",
            "name": "Valid Login",
            "behaviorId": "user-auth",
            "kind": "pytest",
            "entrypoint": "tests/test_auth.py::test_login_success",
            "expectedOutcome": "Login succeeds, token returned",
        },
    ],
}


def get_scenarios_for_project(project_id: str) -> list[dict[str, Any]]:
    """Get all defined scenarios for a project."""
    return SCENARIOS.get(project_id, [])


def get_scenario_by_id(project_id: str, scenario_id: str) -> dict[str, Any] | None:
    """Get a specific scenario by ID."""
    scenarios = SCENARIOS.get(project_id, [])
    for s in scenarios:
        if s["id"] == scenario_id:
            return s
    return None
