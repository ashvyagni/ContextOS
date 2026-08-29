import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from analyzers.python_analyzer import analyze_file, analyze_project

FIXTURES = Path(__file__).parent / "fixtures"


class TestPythonAnalyzer:
    def test_route_extraction(self):
        nodes, edges = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        route_nodes = [n for n in nodes if n["type"] == "route"]
        assert len(route_nodes) == 3

    def test_route_names(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        route_names = {n["name"] for n in nodes if n["type"] == "route"}
        assert "GET /accounts" in route_names
        assert "POST /accounts/{account_id}/withdraw" in route_names
        assert "POST /accounts/{account_id}/deposit" in route_names

    def test_handler_extraction(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        handler_nodes = [n for n in nodes if n["type"] == "handler"]
        handler_names = {n["name"] for n in handler_nodes}
        assert "list_accounts" in handler_names
        assert "withdraw" in handler_names
        assert "deposit" in handler_names

    def test_routes_to_handler_edges(self):
        _, edges = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        routes_to = [e for e in edges if e["type"] == "ROUTES_TO"]
        assert len(routes_to) == 3

    def test_call_edges(self):
        _, edges = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        calls = [e for e in edges if e["type"] == "CALLS"]
        assert len(calls) > 0

    def test_data_nodes(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        data_nodes = [n for n in nodes if n["type"] == "data"]
        assert len(data_nodes) >= 1
        assert any(n["name"] == "Account" for n in data_nodes)

    def test_function_nodes(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        func_nodes = [n for n in nodes if n["type"] == "function"]
        func_names = {n["name"] for n in func_nodes}
        assert "get_account" in func_names
        assert "validate_amount" in func_names

    def test_source_file_populated(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        for n in nodes:
            assert n["file"] != ""

    def test_line_ranges_populated(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        for n in nodes:
            assert n["lineStart"] > 0
            assert n["lineEnd"] >= n["lineStart"]

    def test_language_is_python(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        for n in nodes:
            assert n["language"] == "python"

    def test_analysis_run_id_on_nodes(self):
        nodes, _ = analyze_file(FIXTURES / "sample_backend.py", "run-abc")
        for n in nodes:
            assert n["analysisRunId"] == "run-abc"

    def test_analysis_run_id_on_edges(self):
        _, edges = analyze_file(FIXTURES / "sample_backend.py", "run-abc")
        for e in edges:
            assert e["analysisRunId"] == "run-abc"

    def test_source_ref_populated(self):
        _, edges = analyze_file(FIXTURES / "sample_backend.py", "run-test")
        for e in edges:
            assert e["sourceRef"] != ""

    def test_analyze_project(self):
        nodes, edges = analyze_project(FIXTURES, "run-proj")
        assert len(nodes) > 0
        assert len(edges) > 0

    def test_analyze_project_stamps_run_id(self):
        nodes, edges = analyze_project(FIXTURES, "run-proj")
        for n in nodes:
            assert n["analysisRunId"] == "run-proj"
        for e in edges:
            assert e["analysisRunId"] == "run-proj"
