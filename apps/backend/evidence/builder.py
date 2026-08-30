from __future__ import annotations

import uuid
from typing import Any


def build_evidence(
    changeset: dict[str, Any],
    impact_report: dict[str, Any],
    scenario_results: list[dict[str, Any]],
    behaviors: list[dict[str, Any]],
    project_id: str,
) -> list[dict[str, Any]]:
    """Build evidence items from deterministic analysis results.

    Each evidence item answers: "Why does ContextOS believe X?"
    """
    evidence_items: list[dict[str, Any]] = []
    behavior_map = {b["id"]: b["name"] for b in behaviors}

    if changeset.get("changedFiles"):
        evidence_items.append({
            "id": f"ev-{uuid.uuid4().hex[:12]}",
            "scenarioResultId": "",
            "capabilityCandidateId": None,
            "summary": f"Source files changed: {', '.join(changeset['changedFiles'])}",
            "kind": "regression",
            "details": {
                "changedFiles": changeset["changedFiles"],
                "addedNodes": len(changeset.get("addedNodeIds", [])),
                "removedNodes": len(changeset.get("removedNodeIds", [])),
                "modifiedNodes": len(changeset.get("modifiedNodeIds", [])),
            },
        })

    if impact_report.get("affectedBehaviorIds"):
        affected_names = [
            behavior_map.get(bid, bid)
            for bid in impact_report["affectedBehaviorIds"]
        ]
        evidence_items.append({
            "id": f"ev-{uuid.uuid4().hex[:12]}",
            "scenarioResultId": "",
            "capabilityCandidateId": None,
            "summary": f"Graph traversal identified affected behaviors: {', '.join(affected_names)}",
            "kind": "regression",
            "details": {
                "affectedBehaviorIds": impact_report["affectedBehaviorIds"],
                "riskScore": impact_report.get("riskScore", 0),
                "riskExplanation": impact_report.get("riskExplanation", ""),
            },
        })

    for sr in scenario_results:
        if sr["confirmedRegression"]:
            scenario_name = sr.get("scenarioId", "unknown")
            evidence_items.append({
                "id": f"ev-{uuid.uuid4().hex[:12]}",
                "scenarioResultId": sr["id"],
                "capabilityCandidateId": None,
                "summary": f"Scenario '{scenario_name}' FAILED — confirmed regression",
                "kind": "regression",
                "details": {
                    "scenarioId": sr["scenarioId"],
                    "status": sr["status"],
                    "durationMs": sr["durationMs"],
                    "stderr": sr.get("stderr", "")[:500],
                },
            })
        else:
            scenario_name = sr.get("scenarioId", "unknown")
            evidence_items.append({
                "id": f"ev-{uuid.uuid4().hex[:12]}",
                "scenarioResultId": sr["id"],
                "capabilityCandidateId": None,
                "summary": f"Scenario '{scenario_name}' PASSED — no regression detected",
                "kind": "regression",
                "details": {
                    "scenarioId": sr["scenarioId"],
                    "status": sr["status"],
                    "durationMs": sr["durationMs"],
                },
            })

    if impact_report.get("path"):
        evidence_items.append({
            "id": f"ev-{uuid.uuid4().hex[:12]}",
            "scenarioResultId": "",
            "capabilityCandidateId": None,
            "summary": f"Impact path contains {len(impact_report['path'])} graph edges",
            "kind": "regression",
            "details": {
                "edgeCount": len(impact_report["path"]),
                "edgeTypes": list({e["type"] for e in impact_report["path"]}),
            },
        })

    return evidence_items
