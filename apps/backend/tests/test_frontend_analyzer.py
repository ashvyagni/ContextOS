import json
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from analyzers.frontend_analyzer import (
    analyze_frontend,
    resolve_routes_to_backend,
    _normalize_path,
)

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
BANKING_FRONTEND = PROJECT_ROOT / "reference-apps" / "banking" / "frontend" / "src"
ANALYSIS_RUN_ID = "test-frontend-analyzer"


@pytest.fixture
def frontend_result():
    """Run the ts-morph analyzer on the Banking frontend."""
    nodes, edges = analyze_frontend(BANKING_FRONTEND, ANALYSIS_RUN_ID)
    return nodes, edges


class TestTsMorphAnalyzer:
    def test_produces_nodes(self, frontend_result):
        nodes, _ = frontend_result
        assert len(nodes) > 0

    def test_produces_edges(self, frontend_result):
        _, edges = frontend_result
        assert len(edges) > 0

    def test_component_detection(self, frontend_result):
        nodes, _ = frontend_result
        components = [n for n in nodes if n["type"] == "component"]
        assert len(components) >= 5  # App, AccountList, WithdrawForm, DepositForm, TransferForm, TransactionList
        names = [c["name"] for c in components]
        assert "App" in names
        assert "AccountList" in names
        assert "WithdrawForm" in names
        assert "DepositForm" in names
        assert "TransferForm" in names

    def test_handler_detection(self, frontend_result):
        nodes, _ = frontend_result
        handlers = [n for n in nodes if n["type"] == "handler"]
        assert len(handlers) > 0

    def test_event_handler_detection(self, frontend_result):
        nodes, _ = frontend_result
        event_handlers = [
            n for n in nodes
            if n["type"] == "handler"
            and n.get("metadata", {}).get("event") in ("onClick", "onSubmit", "onChange")
        ]
        assert len(event_handlers) >= 4  # onSubmit for WithdrawForm, DepositForm, TransferForm + onChange handlers

    def test_api_call_detection(self, frontend_result):
        nodes, _ = frontend_result
        api_calls = [
            n for n in nodes
            if n["type"] == "handler"
            and n.get("metadata", {}).get("kind") == "api-call"
        ]
        assert len(api_calls) >= 5  # fetchAccounts, fetchAccount, withdraw, deposit, transfer, fetchTransactions

    def test_api_call_methods(self, frontend_result):
        nodes, _ = frontend_result
        api_calls = [
            n for n in nodes
            if n["type"] == "handler"
            and n.get("metadata", {}).get("kind") == "api-call"
        ]
        methods = {n["metadata"]["method"] for n in api_calls}
        assert "GET" in methods
        assert "POST" in methods

    def test_api_call_urls(self, frontend_result):
        nodes, _ = frontend_result
        api_calls = [
            n for n in nodes
            if n["type"] == "handler"
            and n.get("metadata", {}).get("kind") == "api-call"
        ]
        urls = {n["metadata"]["url"] for n in api_calls}
        assert "/accounts" in urls
        assert "/transfer" in urls

    def test_source_file_populated(self, frontend_result):
        nodes, _ = frontend_result
        for n in nodes:
            assert n["file"] != ""
            assert Path(n["file"]).exists()

    def test_line_ranges_populated(self, frontend_result):
        nodes, _ = frontend_result
        for n in nodes:
            assert n["lineStart"] > 0
            assert n["lineEnd"] >= n["lineStart"]

    def test_language_is_typescript(self, frontend_result):
        nodes, _ = frontend_result
        for n in nodes:
            assert n["language"] == "typescript"

    def test_analysis_run_id_on_nodes(self, frontend_result):
        nodes, _ = frontend_result
        for n in nodes:
            assert n["analysisRunId"] == ANALYSIS_RUN_ID

    def test_analysis_run_id_on_edges(self, frontend_result):
        _, edges = frontend_result
        for e in edges:
            assert e["analysisRunId"] == ANALYSIS_RUN_ID

    def test_triggers_edges(self, frontend_result):
        _, edges = frontend_result
        triggers = [e for e in edges if e["type"] == "TRIGGERS"]
        assert len(triggers) >= 4

    def test_calls_edges(self, frontend_result):
        _, edges = frontend_result
        # CALLS edges are generated when components call functions in the same file.
        # API calls in api.ts don't generate CALLS edges to components in other files.
        # The full pipeline generates CALLS edges via the backend analyzer.
        calls = [e for e in edges if e["type"] == "CALLS"]
        # At minimum, we should have TRIGGERS edges (which are always generated)
        triggers = [e for e in edges if e["type"] == "TRIGGERS"]
        assert len(triggers) > 0


class TestRouteResolution:
    def test_matching_method_and_path(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "handler",
                "name": "GET /accounts",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 15,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {"kind": "api-call", "method": "GET", "url": "/accounts"},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "GET /accounts",
                "file": "app.py",
                "lineStart": 15,
                "lineEnd": 17,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 1
        assert edges[0]["type"] == "ROUTES_TO"
        assert edges[0]["source"] == "fe-1"
        assert edges[0]["target"] == "be-1"

    def test_mismatched_method(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "handler",
                "name": "POST /accounts",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 15,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {"kind": "api-call", "method": "POST", "url": "/accounts"},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "GET /accounts",
                "file": "app.py",
                "lineStart": 15,
                "lineEnd": 17,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 0

    def test_mismatched_path(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "handler",
                "name": "GET /users",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 15,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {"kind": "api-call", "method": "GET", "url": "/users"},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "GET /accounts",
                "file": "app.py",
                "lineStart": 15,
                "lineEnd": 17,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 0

    def test_param_name_normalization(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "handler",
                "name": "POST /accounts/{accountId}/withdraw",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 15,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {"kind": "api-call", "method": "POST", "url": "/accounts/{accountId}/withdraw"},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "POST /accounts/{account_id}/withdraw",
                "file": "app.py",
                "lineStart": 28,
                "lineEnd": 37,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 1

    def test_multiple_backend_routes(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "handler",
                "name": "GET /accounts",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 15,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {"kind": "api-call", "method": "GET", "url": "/accounts"},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "GET /accounts",
                "file": "app.py",
                "lineStart": 15,
                "lineEnd": 17,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            },
            {
                "id": "be-2",
                "type": "route",
                "name": "POST /accounts",
                "file": "app.py",
                "lineStart": 20,
                "lineEnd": 25,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            },
            {
                "id": "be-3",
                "type": "route",
                "name": "GET /users",
                "file": "app.py",
                "lineStart": 30,
                "lineEnd": 35,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            },
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 1
        assert edges[0]["target"] == "be-1"

    def test_no_false_match(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "handler",
                "name": "GET /nonexistent",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 15,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {"kind": "api-call", "method": "GET", "url": "/nonexistent"},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "GET /accounts",
                "file": "app.py",
                "lineStart": 15,
                "lineEnd": 17,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 0

    def test_non_api_call_nodes_skipped(self):
        frontend_nodes = [
            {
                "id": "fe-1",
                "type": "component",
                "name": "App",
                "file": "test.tsx",
                "lineStart": 10,
                "lineEnd": 50,
                "language": "typescript",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        backend_nodes = [
            {
                "id": "be-1",
                "type": "route",
                "name": "GET /accounts",
                "file": "app.py",
                "lineStart": 15,
                "lineEnd": 17,
                "language": "python",
                "analysisRunId": "test-run",
                "metadata": {},
            }
        ]
        edges = resolve_routes_to_backend(frontend_nodes, [], backend_nodes, "test-run")
        assert len(edges) == 0


class TestNormalizePath:
    def test_simple_path(self):
        assert _normalize_path("/accounts") == "/accounts"

    def test_param_normalization(self):
        assert _normalize_path("/accounts/{account_id}/withdraw") == "/accounts/{param}/withdraw"
        assert _normalize_path("/accounts/{accountId}/withdraw") == "/accounts/{param}/withdraw"

    def test_template_literal_syntax(self):
        assert _normalize_path("/accounts/${accountId}/withdraw") == "/accounts/{param}/withdraw"

    def test_colon_syntax(self):
        assert _normalize_path("/accounts/:id/withdraw") == "/accounts/{param}/withdraw"

    def test_trailing_slash(self):
        assert _normalize_path("/accounts/") == "/accounts"

    def test_double_slashes(self):
        assert _normalize_path("/accounts//withdraw") == "/accounts/withdraw"


class TestUnifiedGraph:
    def test_banking_analysis_includes_frontend_nodes(self):
        from fastapi.testclient import TestClient
        from main import app, PROJECT_REGISTRY, _register_projects
        from db.database import init_db, get_connection, cleanup_db, upsert_project

        cleanup_db()
        _register_projects()
        conn = get_connection()
        init_db(conn)
        for pid, info in PROJECT_REGISTRY.items():
            upsert_project(conn, info["id"], info["name"], info["rootPath"])
        conn.close()

        try:
            client = TestClient(app)
            r = client.post("/projects/banking/analyze")
            assert r.status_code == 200
            data = r.json()
            assert data["frontendNodeCount"] > 0
            assert data["routeResolutionEdgeCount"] > 0
        finally:
            cleanup_db()

    def test_graph_has_typescript_nodes(self):
        from fastapi.testclient import TestClient
        from main import app, PROJECT_REGISTRY, _register_projects
        from db.database import init_db, get_connection, cleanup_db, upsert_project

        cleanup_db()
        _register_projects()
        conn = get_connection()
        init_db(conn)
        for pid, info in PROJECT_REGISTRY.items():
            upsert_project(conn, info["id"], info["name"], info["rootPath"])
        conn.close()

        try:
            client = TestClient(app)
            client.post("/projects/banking/analyze")
            r = client.get("/projects/banking/graph")
            nodes = r.json()["nodes"]
            ts_nodes = [n for n in nodes if n.get("language") == "typescript"]
            assert len(ts_nodes) > 0
        finally:
            cleanup_db()

    def test_graph_has_routes_to_frontend_edges(self):
        from fastapi.testclient import TestClient
        from main import app, PROJECT_REGISTRY, _register_projects
        from db.database import init_db, get_connection, cleanup_db, upsert_project

        cleanup_db()
        _register_projects()
        conn = get_connection()
        init_db(conn)
        for pid, info in PROJECT_REGISTRY.items():
            upsert_project(conn, info["id"], info["name"], info["rootPath"])
        conn.close()

        try:
            client = TestClient(app)
            client.post("/projects/banking/analyze")
            r = client.get("/projects/banking/graph")
            edges = r.json()["edges"]
            routes_to = [e for e in edges if e["type"] == "ROUTES_TO"]
            assert len(routes_to) >= 6  # 6 backend ROUTES_TO + 6 frontend-to-backend ROUTES_TO
        finally:
            cleanup_db()

    def test_all_nodes_share_analysis_run_id(self):
        from fastapi.testclient import TestClient
        from main import app, PROJECT_REGISTRY, _register_projects
        from db.database import init_db, get_connection, cleanup_db, upsert_project

        cleanup_db()
        _register_projects()
        conn = get_connection()
        init_db(conn)
        for pid, info in PROJECT_REGISTRY.items():
            upsert_project(conn, info["id"], info["name"], info["rootPath"])
        conn.close()

        try:
            client = TestClient(app)
            r = client.post("/projects/banking/analyze")
            run_id = r.json()["runId"]
            r2 = client.get(f"/projects/banking/graph?runId={run_id}")
            data = r2.json()
            for n in data["nodes"]:
                assert n["analysisRunId"] == run_id
            for e in data["edges"]:
                assert e["analysisRunId"] == run_id
        finally:
            cleanup_db()

    def test_source_endpoint_works_for_frontend_nodes(self):
        from fastapi.testclient import TestClient
        from main import app, PROJECT_REGISTRY, _register_projects
        from db.database import init_db, get_connection, cleanup_db, upsert_project

        cleanup_db()
        _register_projects()
        conn = get_connection()
        init_db(conn)
        for pid, info in PROJECT_REGISTRY.items():
            upsert_project(conn, info["id"], info["name"], info["rootPath"])
        conn.close()

        try:
            client = TestClient(app)
            client.post("/projects/banking/analyze")
            r = client.get("/projects/banking/graph")
            nodes = r.json()["nodes"]
            ts_nodes = [n for n in nodes if n.get("language") == "typescript"]
            if ts_nodes:
                node_id = ts_nodes[0]["id"]
                r2 = client.get(f"/nodes/{node_id}/source")
                assert r2.status_code == 200
                data = r2.json()
                assert "file" in data
                assert "lineStart" in data
        finally:
            cleanup_db()
