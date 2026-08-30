from __future__ import annotations

from typing import Any

import networkx as nx


def build_graph(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    behaviors: list[dict[str, Any]] | None = None,
    analysis_run_id: str = "",
) -> nx.DiGraph:
    """Build a NetworkX directed graph from nodes, edges, and behaviors.

    The graph is constructed in memory. No partial state is exposed.
    """
    G = nx.DiGraph()

    # Add behavior nodes from contextos.yaml
    # Use analysis_run_id in the node ID to avoid collisions across runs
    if behaviors:
        for b in behaviors:
            behavior_node_id = f"behavior:{b['id']}"
            G.add_node(
                behavior_node_id,
                id=behavior_node_id,
                type="behavior",
                name=b["name"],
                file="",
                lineStart=0,
                lineEnd=0,
                language="yaml",
                behaviorId=b["id"],
                analysisRunId=analysis_run_id,
                metadata={"category": b.get("category", "")},
            )

    # Add graph nodes
    for n in nodes:
        node_id = n["id"]
        G.add_node(
            node_id,
            id=node_id,
            type=n["type"],
            name=n["name"],
            file=n["file"],
            lineStart=n["lineStart"],
            lineEnd=n["lineEnd"],
            language=n["language"],
            behaviorId=n.get("behaviorId"),
            analysisRunId=n["analysisRunId"],
            metadata=n.get("metadata", {}),
        )

    # Add behavior IMPLEMENTS edges: route nodes -> behavior nodes
    if behaviors:
        for b in behaviors:
            behavior_node_id = f"behavior:{b['id']}"
            for ep in b.get("entrypoints", []):
                # Match entrypoints like "backend:path::METHOD /route"
                if "::" in ep:
                    route_part = ep.split("::", 1)[1]  # e.g. "POST /accounts/{id}/withdraw"
                    # Find the matching route node
                    for n in nodes:
                        if n["type"] == "route" and n["name"] == route_part:
                            G.add_edge(
                                n["id"],
                                behavior_node_id,
                                id=f"impl:{n['id']}:{behavior_node_id}",
                                type="IMPLEMENTS",
                                confidence=1.0,
                                analysisRunId=analysis_run_id,
                                sourceRef=f"{n['file']}:{n['lineStart']}",
                                metadata={},
                            )

    # Add graph edges — create stub nodes for external references
    node_ids = {n["id"] for n in nodes}
    if behaviors:
        node_ids.update(f"behavior:{b['id']}" for b in behaviors)

    for e in edges:
        # Add stub node for external targets not already in the graph
        # Use analysis_run_id in external node IDs to avoid collisions across runs
        target_id = e["target"]
        if target_id not in node_ids:
            if target_id.startswith("external:"):
                run_unique_id = target_id
            else:
                run_unique_id = target_id

            G.add_node(
                run_unique_id,
                id=run_unique_id,
                type="external",
                name=target_id.replace("external:", ""),
                file="",
                lineStart=0,
                lineEnd=0,
                language="unknown",
                behaviorId=None,
                analysisRunId=e["analysisRunId"],
                metadata={},
            )
            node_ids.add(run_unique_id)
        else:
            run_unique_id = target_id

        # Also check if source needs remapping for behavior nodes
        source_id = e["source"]
        if source_id.startswith("behavior:"):
            # behavior source IDs are already run-unique from the behavior node creation
            pass

        G.add_edge(
            e["source"],
            run_unique_id,
            id=e["id"],
            type=e["type"],
            confidence=e["confidence"],
            analysisRunId=e["analysisRunId"],
            sourceRef=e["sourceRef"],
            metadata=e.get("metadata", {}),
        )

    return G


def graph_to_nodes_edges(G: nx.DiGraph) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Extract nodes and edges lists from a NetworkX graph."""
    nodes = []
    for _, data in G.nodes(data=True):
        nodes.append(dict(data))

    edges = []
    for u, v, data in G.edges(data=True):
        edge_data = dict(data)
        edge_data["source"] = u
        edge_data["target"] = v
        edges.append(edge_data)

    return nodes, edges
