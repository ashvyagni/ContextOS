from __future__ import annotations

import uuid
from collections import deque
from typing import Any

import networkx as nx


def analyze_impact(
    G: nx.DiGraph,
    changeset: dict[str, Any],
    behaviors: list[dict[str, Any]],
) -> dict[str, Any]:
    """BFS impact analysis from changed nodes through the graph.

    Deterministic — no AI involved. Follows edges in reverse direction
    (upstream from change) and forward direction (downstream from change)
    to find affected behaviors.
    """
    affected_node_ids: set[str] = set()
    affected_behavior_ids: set[str] = set()
    impact_path_edges: list[dict[str, Any]] = []

    changed_ids = (
        set(changeset.get("addedNodeIds", []))
        | set(changeset.get("removedNodeIds", []))
        | set(changeset.get("modifiedNodeIds", []))
    )

    for node_id in changed_ids:
        if node_id not in G:
            continue
        affected_node_ids.add(node_id)

        bfs_visited: set[str] = {node_id}
        queue: deque[tuple[str, list[str]]] = deque([(node_id, [node_id])])

        while queue:
            current, path = queue.popleft()

            for predecessor in G.predecessors(current):
                if predecessor not in bfs_visited:
                    bfs_visited.add(predecessor)
                    affected_node_ids.add(predecessor)
                    new_path = path + [predecessor]
                    queue.append((predecessor, new_path))
                    if G.has_edge(predecessor, current):
                        edge_data = G.edges[predecessor, current]
                        impact_path_edges.append({
                            "id": edge_data.get("id", f"impact:{predecessor}:{current}"),
                            "source": predecessor,
                            "target": current,
                            "type": edge_data.get("type", "DEPENDS_ON"),
                            "confidence": edge_data.get("confidence", 1.0),
                            "analysisRunId": edge_data.get("analysisRunId", ""),
                            "sourceRef": edge_data.get("sourceRef", ""),
                            "metadata": edge_data.get("metadata", {}),
                        })

        bfs_visited2: set[str] = {node_id}
        queue2: deque[tuple[str, list[str]]] = deque([(node_id, [node_id])])

        while queue2:
            current, path = queue2.popleft()

            for successor in G.successors(current):
                if successor not in bfs_visited2:
                    bfs_visited2.add(successor)
                    affected_node_ids.add(successor)
                    new_path = path + [successor]
                    queue2.append((successor, new_path))
                    if G.has_edge(current, successor):
                        edge_data = G.edges[current, successor]
                        impact_path_edges.append({
                            "id": edge_data.get("id", f"impact:{current}:{successor}"),
                            "source": current,
                            "target": successor,
                            "type": edge_data.get("type", "DEPENDS_ON"),
                            "confidence": edge_data.get("confidence", 1.0),
                            "analysisRunId": edge_data.get("analysisRunId", ""),
                            "sourceRef": edge_data.get("sourceRef", ""),
                            "metadata": edge_data.get("metadata", {}),
                        })

    for b in behaviors:
        behavior_node_id_pattern = f"behavior:{b['id']}"
        for nid in affected_node_ids:
            if nid.startswith(behavior_node_id_pattern):
                affected_behavior_ids.add(b["id"])

    for b in behaviors:
        behavior_node_id = f"behavior:{b['id']}"
        for nid in affected_node_ids:
            if nid.startswith(behavior_node_id):
                for successor in G.successors(nid):
                    if successor in affected_node_ids:
                        affected_behavior_ids.add(b["id"])

    risk_score = _calculate_risk_score(
        len(changed_ids),
        len(affected_node_ids),
        len(affected_behavior_ids),
        len(changeset.get("addedNodeIds", [])),
        len(changeset.get("removedNodeIds", [])),
    )

    risk_explanation = _generate_explanation(
        changeset, affected_behavior_ids, behaviors, risk_score
    )

    impact_id = f"imp-{uuid.uuid4().hex[:12]}"
    return {
        "id": impact_id,
        "changeSetId": changeset["id"],
        "affectedBehaviorIds": list(affected_behavior_ids),
        "affectedNodeIds": list(affected_node_ids),
        "riskScore": risk_score,
        "riskExplanation": risk_explanation,
        "path": impact_path_edges,
    }


def _calculate_risk_score(
    changed_count: int,
    affected_count: int,
    behavior_count: int,
    added_count: int,
    removed_count: int,
) -> float:
    """Calculate a deterministic risk score 0.0-1.0."""
    score = 0.0
    score += min(changed_count * 0.1, 0.3)
    score += min(affected_count * 0.05, 0.3)
    score += min(behavior_count * 0.15, 0.3)
    score += removed_count * 0.05
    return min(score, 1.0)


def _generate_explanation(
    changeset: dict[str, Any],
    affected_behavior_ids: set[str],
    behaviors: list[dict[str, Any]],
    risk_score: float,
) -> str:
    """Generate a deterministic risk explanation."""
    changed_files = changeset.get("changedFiles", [])
    added = changeset.get("addedNodeIds", [])
    removed = changeset.get("removedNodeIds", [])
    modified = changeset.get("modifiedNodeIds", [])

    behavior_map = {b["id"]: b["name"] for b in behaviors}
    affected_names = [behavior_map.get(bid, bid) for bid in affected_behavior_ids]

    parts = []
    if changed_files:
        parts.append(f"Changed files: {', '.join(changed_files[:5])}")
    if added:
        parts.append(f"{len(added)} nodes added")
    if removed:
        parts.append(f"{len(removed)} nodes removed")
    if modified:
        parts.append(f"{len(modified)} nodes modified")

    if affected_names:
        parts.append(
            f"Affected behaviors: {', '.join(affected_names)}"
        )

    risk_level = (
        "HIGH" if risk_score > 0.6
        else "MEDIUM" if risk_score > 0.3
        else "LOW"
    )
    parts.append(f"Risk level: {risk_level} (score: {risk_score:.2f})")

    return ". ".join(parts) + "." if parts else "No significant impact detected."
