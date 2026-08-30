from __future__ import annotations

import ast
import uuid
from pathlib import Path
from typing import Any


import hashlib

def _stable_id(*parts: str) -> str:
    key = "|".join(str(p) for p in parts)
    return hashlib.md5(key.encode()).hexdigest()[:12]

def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def _make_node(
    *,
    type_: str,
    name: str,
    file: str,
    line_start: int,
    line_end: int,
    language: str,
    analysis_run_id: str,
    behavior_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": _stable_id(file, name, type_) if "file" in locals() else _stable_id(source, target, edge_type),
        "type": type_,
        "name": name,
        "file": file,
        "lineStart": line_start,
        "lineEnd": line_end,
        "language": language,
        "behaviorId": behavior_id,
        "analysisRunId": analysis_run_id,
        "metadata": metadata or {},
    }


def _make_edge(
    *,
    source: str,
    target: str,
    edge_type: str,
    confidence: float,
    analysis_run_id: str,
    source_ref: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "id": _stable_id(file, name, type_) if "file" in locals() else _stable_id(source, target, edge_type),
        "source": source,
        "target": target,
        "type": edge_type,
        "confidence": confidence,
        "analysisRunId": analysis_run_id,
        "sourceRef": source_ref,
        "metadata": metadata or {},
    }


def _extract_decorator_info(decorator: ast.expr) -> tuple[str, str] | None:
    """Extract (http_method, route_path) from a FastAPI decorator.

    Handles: @app.get("/path"), @app.post("/path"), etc.
    """
    if not isinstance(decorator, ast.Call):
        return None
    if not isinstance(decorator.func, ast.Attribute):
        return None

    attr = decorator.func.attr
    methods = {"get", "post", "put", "patch", "delete"}
    if attr not in methods:
        return None

    if not decorator.args:
        return None

    first_arg = decorator.args[0]
    if isinstance(first_arg, ast.Constant) and isinstance(first_arg.value, str):
        return (attr.upper(), first_arg.value)

    return None


def _get_function_body_end(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> int:
    """Get the end line of a function, including decorators."""
    if func_node.decorator_list:
        last_decorator = func_node.decorator_list[-1]
        if func_node.body:
            last_stmt = func_node.body[-1]
            return last_stmt.end_lineno or last_stmt.lineno
    if func_node.body:
        last_stmt = func_node.body[-1]
        return last_stmt.end_lineno or last_stmt.lineno
    return func_node.end_lineno or func_node.lineno


def _extract_calls(func_node: ast.FunctionDef | ast.AsyncFunctionDef) -> list[str]:
    """Extract function call names from a function body."""
    calls = []
    for node in ast.walk(func_node):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                calls.append(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                calls.append(node.func.attr)
    return calls


def analyze_file(
    file_path: str | Path,
    analysis_run_id: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Analyze a single Python file using AST.

    Returns (nodes, edges) for the file.
    """
    path = Path(file_path)
    source = path.read_text()
    tree = ast.parse(source, filename=str(path))
    rel_path = str(path)

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    # Track defined functions for call resolution
    defined_functions: dict[str, dict[str, Any]] = {}

    for node in ast.iter_child_nodes(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue

        # Check for FastAPI route decorators
        for decorator in node.decorator_list:
            route_info = _extract_decorator_info(decorator)
            if route_info:
                method, path_str = route_info
                route_name = f"{method} {path_str}"

                route_node = _make_node(
                    type_="route",
                    name=route_name,
                    file=rel_path,
                    line_start=node.decorator_list[0].lineno,
                    line_end=_get_function_body_end(node),
                    language="python",
                    analysis_run_id=analysis_run_id,
                )
                nodes.append(route_node)

                handler_node = _make_node(
                    type_="handler",
                    name=node.name,
                    file=rel_path,
                    line_start=node.lineno,
                    line_end=node.end_lineno or node.lineno,
                    language="python",
                    analysis_run_id=analysis_run_id,
                )
                nodes.append(handler_node)
                defined_functions[node.name] = handler_node

                # route -> handler (ROUTES_TO)
                edges.append(_make_edge(
                    source=route_node["id"],
                    target=handler_node["id"],
                    edge_type="ROUTES_TO",
                    confidence=1.0,
                    analysis_run_id=analysis_run_id,
                    source_ref=f"{rel_path}:{node.lineno}",
                ))

                # Extract calls within the handler
                for call_name in _extract_calls(node):
                    edges.append(_make_edge(
                        source=handler_node["id"],
                        target=f"external:{call_name}",
                        edge_type="CALLS",
                        confidence=0.9,
                        analysis_run_id=analysis_run_id,
                        source_ref=f"{rel_path}:{node.lineno}",
                        metadata={"callName": call_name},
                    ))

        # Non-route functions
        if not any(isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute)
                    and getattr(d.func, "attr", "") in {"get", "post", "put", "patch", "delete"}
                    for d in node.decorator_list):
            func_node = _make_node(
                type_="function",
                name=node.name,
                file=rel_path,
                line_start=node.lineno,
                line_end=node.end_lineno or node.lineno,
                language="python",
                analysis_run_id=analysis_run_id,
            )
            nodes.append(func_node)
            defined_functions[node.name] = func_node

            for call_name in _extract_calls(node):
                edges.append(_make_edge(
                    source=func_node["id"],
                    target=f"external:{call_name}",
                    edge_type="CALLS",
                    confidence=0.9,
                    analysis_run_id=analysis_run_id,
                    source_ref=f"{rel_path}:{node.lineno}",
                    metadata={"callName": call_name},
                ))

    # Class definitions -> service/data nodes
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            # Heuristic: classes with Pydantic BaseModel inheritance are "data"
            is_data = any(
                (isinstance(base, ast.Name) and base.id in ("BaseModel",))
                or (isinstance(base, ast.Attribute) and base.attr in ("BaseModel",))
                for base in node.bases
            )
            node_type = "data" if is_data else "service"

            svc_node = _make_node(
                type_=node_type,
                name=node.name,
                file=rel_path,
                line_start=node.lineno,
                line_end=node.end_lineno or node.lineno,
                language="python",
                analysis_run_id=analysis_run_id,
            )
            nodes.append(svc_node)

    return nodes, edges


def analyze_project(
    project_dir: str | Path,
    analysis_run_id: str,
    file_patterns: list[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Walk a project directory and analyze all Python files.

    Returns (all_nodes, all_edges) across the project.
    """
    if file_patterns is None:
        file_patterns = ["*.py"]

    project_path = Path(project_dir)
    all_nodes: list[dict[str, Any]] = []
    all_edges: list[dict[str, Any]] = []

    for pattern in file_patterns:
        for py_file in sorted(project_path.rglob(pattern)):
            # Skip __pycache__ and venv directories
            parts = py_file.parts
            if any(p in ("__pycache__", "venv", ".venv", "node_modules") for p in parts):
                continue

            file_nodes, file_edges = analyze_file(py_file, analysis_run_id)
            all_nodes.extend(file_nodes)
            all_edges.extend(file_edges)

    return all_nodes, all_edges
