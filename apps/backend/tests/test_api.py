import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app, PROJECT_REGISTRY, _register_projects
from db.database import init_db, get_connection, cleanup_db, upsert_project

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    """Ensure clean DB for each test."""
    cleanup_db()
    _register_projects()
    conn = get_connection()
    init_db(conn)
    for pid, info in PROJECT_REGISTRY.items():
        upsert_project(conn, info["id"], info["name"], info["rootPath"])
    conn.close()
    yield
    cleanup_db()


class TestHealthEndpoint:
    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestProjectsEndpoint:
    def test_list_projects(self):
        r = client.get("/projects")
        assert r.status_code == 200
        projects = r.json()
        assert isinstance(projects, list)
        assert len(projects) >= 1

    def test_banking_project_exists(self):
        r = client.get("/projects")
        projects = r.json()
        ids = [p["id"] for p in projects]
        assert "banking" in ids


class TestAnalyzeEndpoint:
    def test_analyze_banking(self):
        r = client.post("/projects/banking/analyze")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "completed"
        assert data["nodeCount"] > 0
        assert data["edgeCount"] > 0
        assert data["behaviorCount"] == 5

    def test_analyze_returns_run_id(self):
        r = client.post("/projects/banking/analyze")
        data = r.json()
        assert "runId" in data
        assert len(data["runId"]) > 0

    def test_analyze_nonexistent_project(self):
        r = client.post("/projects/nonexistent/analyze")
        assert r.status_code == 404

    def test_analyze_produces_nodes_with_analysis_run_id(self):
        r = client.post("/projects/banking/analyze")
        run_id = r.json()["runId"]
        r2 = client.get(f"/projects/banking/graph?runId={run_id}")
        nodes = r2.json()["nodes"]
        assert len(nodes) > 0
        for n in nodes:
            assert n["analysisRunId"] == run_id

    def test_analyze_produces_edges_with_analysis_run_id(self):
        r = client.post("/projects/banking/analyze")
        run_id = r.json()["runId"]
        r2 = client.get(f"/projects/banking/graph?runId={run_id}")
        edges = r2.json()["edges"]
        assert len(edges) > 0
        for e in edges:
            assert e["analysisRunId"] == run_id


class TestGraphEndpoint:
    def test_graph_after_analyze(self):
        client.post("/projects/banking/analyze")
        r = client.get("/projects/banking/graph")
        assert r.status_code == 200
        data = r.json()
        assert "nodes" in data
        assert "edges" in data
        assert "runId" in data

    def test_graph_specific_run(self):
        r1 = client.post("/projects/banking/analyze")
        run_id = r1.json()["runId"]
        r2 = client.get(f"/projects/banking/graph?runId={run_id}")
        assert r2.status_code == 200
        assert r2.json()["runId"] == run_id

    def test_graph_nonexistent_run(self):
        r = client.get("/projects/banking/graph?runId=nonexistent")
        assert r.status_code == 404

    def test_graph_no_runs(self):
        r = client.get("/projects/nonexistent/graph")
        assert r.status_code == 404

    def test_graph_has_route_nodes(self):
        client.post("/projects/banking/analyze")
        r = client.get("/projects/banking/graph")
        nodes = r.json()["nodes"]
        route_nodes = [n for n in nodes if n["type"] == "route"]
        assert len(route_nodes) >= 5

    def test_graph_has_behavior_nodes(self):
        client.post("/projects/banking/analyze")
        r = client.get("/projects/banking/graph")
        nodes = r.json()["nodes"]
        behavior_nodes = [n for n in nodes if n["type"] == "behavior"]
        assert len(behavior_nodes) == 5

    def test_graph_has_implements_edges(self):
        client.post("/projects/banking/analyze")
        r = client.get("/projects/banking/graph")
        edges = r.json()["edges"]
        impl_edges = [e for e in edges if e["type"] == "IMPLEMENTS"]
        assert len(impl_edges) >= 5


class TestRunsEndpoint:
    def test_runs_after_analyze(self):
        client.post("/projects/banking/analyze")
        r = client.get("/projects/banking/runs")
        assert r.status_code == 200
        runs = r.json()
        assert len(runs) >= 1
        assert runs[0]["status"] == "completed"

    def test_runs_mark_analysis_run_id(self):
        r1 = client.post("/projects/banking/analyze")
        run_id = r1.json()["runId"]
        r2 = client.get("/projects/banking/runs")
        run_ids = [run["id"] for run in r2.json()]
        assert run_id in run_ids


class TestNodeSourceEndpoint:
    def test_node_source_after_analyze(self):
        r1 = client.post("/projects/banking/analyze")
        run_id = r1.json()["runId"]
        r2 = client.get(f"/projects/banking/graph?runId={run_id}")
        nodes = r2.json()["nodes"]
        # Pick a node that has a real file
        real_nodes = [n for n in nodes if Path(n["file"]).exists()]
        if real_nodes:
            node_id = real_nodes[0]["id"]
            r3 = client.get(f"/nodes/{node_id}/source")
            assert r3.status_code == 200
            data = r3.json()
            assert "file" in data
            assert "lineStart" in data
            assert "lineEnd" in data

    def test_node_source_nonexistent(self):
        r = client.get("/nodes/nonexistent-node/source")
        assert r.status_code == 404
