import sys
from pathlib import Path

import pytest
import networkx as nx

sys.path.insert(0, str(Path(__file__).parent.parent))

from analyzers.python_analyzer import analyze_file
from graph.builder import build_graph, graph_to_nodes_edges

FIXTURES = Path(__file__).parent / "fixtures"


class TestGraphBuilder:
    def _get_analysis(self):
        nodes, edges = analyze_file(FIXTURES / "sample_backend.py", "run-gb")
        behaviors = [
            {
                "id": "withdraw",
                "name": "Withdraw",
                "category": "transaction",
                "entrypoints": [
                    "backend:sample.py::POST /accounts/{account_id}/withdraw"
                ],
                "projectId": "test",
            }
        ]
        return nodes, edges, behaviors

    def test_graph_is_networkx_digraph(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        assert isinstance(G, nx.DiGraph)

    def test_behavior_nodes_created(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        behavior_nodes = [n for n, d in G.nodes(data=True) if d.get("type") == "behavior"]
        assert len(behavior_nodes) == 1

    def test_behavior_node_has_correct_id(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        assert "behavior:withdraw" in G.nodes

    def test_graph_node_count(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        # External call targets also become nodes, so count >= original + behavior
        assert G.number_of_nodes() >= len(nodes) + 1

    def test_graph_edge_count(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        assert G.number_of_edges() >= len(edges)

    def test_implements_edge_created(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        impl_edges = [
            (u, v, d)
            for u, v, d in G.edges(data=True)
            if d.get("type") == "IMPLEMENTS"
        ]
        assert len(impl_edges) == 1

    def test_analysis_run_id_on_all_nodes(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        for _, data in G.nodes(data=True):
            assert data.get("analysisRunId") is not None

    def test_analysis_run_id_on_all_edges(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        for _, _, data in G.edges(data=True):
            assert data.get("analysisRunId") == "run-gb"

    def test_no_partial_graph_exposed(self):
        """Graph is built in memory, then returned complete."""
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        # All original nodes should be present
        for n in nodes:
            assert n["id"] in G.nodes

    def test_graph_to_nodes_edges_roundtrip(self):
        nodes, edges, behaviors = self._get_analysis()
        G = build_graph(nodes, edges, behaviors, "run-gb")
        out_nodes, out_edges = graph_to_nodes_edges(G)
        assert len(out_nodes) == G.number_of_nodes()
        assert len(out_edges) == G.number_of_edges()

    def test_empty_graph(self):
        G = build_graph([], [], None, "run-empty")
        assert G.number_of_nodes() == 0
        assert G.number_of_edges() == 0

    def test_graph_without_behaviors(self):
        nodes, edges, _ = self._get_analysis()
        G = build_graph(nodes, edges, None, "run-nb")
        # External call targets also become nodes
        assert G.number_of_nodes() >= len(nodes)
