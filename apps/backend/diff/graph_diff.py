from __future__ import annotations

import uuid
from typing import Any


def compute_changeset(
    old_nodes: list[dict[str, Any]],
    old_edges: list[dict[str, Any]],
    new_nodes: list[dict[str, Any]],
    new_edges: list[dict[str, Any]],
    changed_files: list[str],
    new_run_id: str,
) -> dict[str, Any]:
    """Compute a ChangeSet by comparing two analysis runs.

    Deterministic — no AI involved.
    """
    old_node_map = {n["id"]: n for n in old_nodes}
    new_node_map = {n["id"]: n for n in new_nodes}

    old_node_ids = set(old_node_map.keys())
    new_node_ids = set(new_node_map.keys())

    added_node_ids = list(new_node_ids - old_node_ids)
    removed_node_ids = list(old_node_ids - new_node_ids)

    modified_node_ids: list[str] = []
    for nid in old_node_ids & new_node_ids:
        old_n = old_node_map[nid]
        new_n = new_node_map[nid]
        if (
            old_n.get("file") != new_n.get("file")
            or old_n.get("lineStart") != new_n.get("lineStart")
            or old_n.get("lineEnd") != new_n.get("lineEnd")
            or old_n.get("name") != new_n.get("name")
        ):
            modified_node_ids.append(nid)

    old_edge_ids = {e["id"] for e in old_edges}
    new_edge_ids = {e["id"] for e in new_edges}
    added_edges = list(new_edge_ids - old_edge_ids)
    removed_edges = list(old_edge_ids - new_edge_ids)

    changeset_id = f"cs-{uuid.uuid4().hex[:12]}"
    return {
        "id": changeset_id,
        "analysisRunId": new_run_id,
        "changedFiles": changed_files,
        "addedNodeIds": added_node_ids,
        "removedNodeIds": removed_node_ids,
        "modifiedNodeIds": modified_node_ids,
        "addedEdgeCount": len(added_edges),
        "removedEdgeCount": len(removed_edges),
    }
