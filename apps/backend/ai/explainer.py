from __future__ import annotations

import json
import os
import uuid
from typing import Any

AI_CACHE: dict[str, dict[str, str]] = {
    "withdraw": {
        "name": "Withdrawal Processing",
        "summary": "The withdraw behavior handles fund withdrawal from accounts. It validates sufficient balance, updates the account balance, and records a transaction.",
        "explanation": "The withdrawal flow involves the POST /accounts/{id}/withdraw endpoint, which calls the withdraw handler, which interacts with the Account data model and creates a Transaction record.",
    },
    "deposit": {
        "name": "Deposit Processing",
        "summary": "The deposit behavior handles fund deposits to accounts. It validates the amount is positive, updates the account balance, and records a transaction.",
        "explanation": "The deposit flow involves the POST /accounts/{id}/deposit endpoint, which calls the deposit handler, which interacts with the Account data model and creates a Transaction record.",
    },
    "transfer": {
        "name": "Transfer Processing",
        "summary": "The transfer behavior moves funds between two accounts. It validates both accounts exist, withdraws from the source, deposits to the target, and records the transaction.",
        "explanation": "The transfer flow involves the POST /transfer endpoint, which calls the transfer handler, which orchestrates withdraw and deposit operations across two Account records.",
    },
    "account-management": {
        "name": "Account Management",
        "summary": "The account management behavior provides account listing and retrieval operations.",
        "explanation": "The account management flow involves the GET /accounts endpoint, which returns all accounts from the in-memory data store.",
    },
    "list-transactions": {
        "name": "Transaction History",
        "summary": "The list transactions behavior retrieves transaction history for a specific account.",
        "explanation": "The transaction listing flow involves the GET /accounts/{id}/transactions endpoint, which filters the transaction store by account ID.",
    },
    "product-browsing": {
        "name": "Product Browsing",
        "summary": "The product browsing behavior allows users to view available products from the database.",
        "explanation": "Product browsing involves GET /products and GET /products/{id} endpoints, querying the Product table via SQLAlchemy.",
    },
    "cart-management": {
        "name": "Cart Management",
        "summary": "The cart management behavior handles adding items to a user's shopping cart.",
        "explanation": "Cart management involves the POST /cart endpoint, which creates CartItem records in the database.",
    },
    "checkout": {
        "name": "Checkout Processing",
        "summary": "The checkout behavior processes cart items into orders with payment.",
        "explanation": "Checkout involves POST /checkout and POST /coupon endpoints, which calculate totals, create Order records, and clear the cart.",
    },
    "user-auth": {
        "name": "User Authentication",
        "summary": "The authentication behavior handles user login with credential validation.",
        "explanation": "Authentication involves the POST /login endpoint, which validates credentials and returns a session token.",
    },
}

AI_FALLBACK: dict[str, str] = {
    "name": "Unknown Capability",
    "summary": "Insufficient information to describe this capability.",
    "explanation": "Insufficient evidence to determine the impact. The AI service could not provide an analysis.",
}


def explain_impact(
    impact_report: dict[str, Any],
    changeset: dict[str, Any],
    evidence: list[dict[str, Any]],
    behaviors: list[dict[str, Any]],
) -> dict[str, Any]:
    """Generate an AI explanation for the impact analysis.

    Uses cached knowledge — no live AI call for the MVP.
    Falls back gracefully if the behavior is unknown.
    """
    behavior_map = {b["id"]: b["name"] for b in behaviors}
    affected_ids = impact_report.get("affectedBehaviorIds", [])

    explanations: list[dict[str, Any]] = []
    for bid in affected_ids:
        cached = AI_CACHE.get(bid, AI_FALLBACK)
        explanations.append({
            "behaviorId": bid,
            "behaviorName": behavior_map.get(bid, bid),
            "name": cached["name"],
            "summary": cached["summary"],
            "explanation": cached["explanation"],
        })

    confirmed_regressions = [
        e for e in evidence
        if e.get("kind") == "regression" and "FAILED" in e.get("summary", "")
    ]

    if confirmed_regressions:
        overall_conclusion = (
            f"CONFIRMED REGRESSION: {len(confirmed_regressions)} scenario(s) failed "
            f"affecting {len(affected_ids)} behavior(s). "
            f"Risk score: {impact_report.get('riskScore', 0):.2f}."
        )
    elif affected_ids:
        overall_conclusion = (
            f"Potential impact on {len(affected_ids)} behavior(s) detected. "
            f"No confirmed regressions yet. "
            f"Risk score: {impact_report.get('riskScore', 0):.2f}."
        )
    else:
        overall_conclusion = (
            "No significant impact detected. "
            "The changes do not appear to affect existing behaviors."
        )

    return {
        "id": f"ai-{uuid.uuid4().hex[:12]}",
        "impactReportId": impact_report["id"],
        "changeSetId": changeset["id"],
        "overallConclusion": overall_conclusion,
        "behaviorExplanations": explanations,
        "evidenceSummary": [
            {"summary": e["summary"], "kind": e["kind"]}
            for e in evidence
        ],
    }


def name_capability(
    capability_candidate: dict[str, Any],
    evidence: list[dict[str, Any]],
) -> dict[str, Any]:
    """Name a capability candidate using cached knowledge.

    No live AI call for the MVP.
    """
    node_ids = capability_candidate.get("nodeIds", [])
    layers = capability_candidate.get("layersCovered", [])

    name = "Unknown Capability"
    summary = "Insufficient evidence to name this capability."

    if "UI" in layers and "API" in layers and "Logic" in layers:
        name = "Full-Stack Feature"
        summary = f"New capability detected spanning {len(layers)} layers with {len(node_ids)} nodes."
    elif "API" in layers and "Logic" in layers:
        name = "Backend Service"
        summary = f"New backend capability detected with {len(node_ids)} nodes across {len(layers)} layers."
    elif "UI" in layers:
        name = "UI Feature"
        summary = f"New UI capability detected with {len(node_ids)} nodes."
    else:
        name = f"New Capability ({len(node_ids)} nodes)"
        summary = f"Structural cluster detected spanning layers: {', '.join(layers)}."

    return {
        "id": f"ai-cap-{uuid.uuid4().hex[:12]}",
        "capabilityCandidateId": capability_candidate.get("id", ""),
        "name": name,
        "summary": summary,
    }
