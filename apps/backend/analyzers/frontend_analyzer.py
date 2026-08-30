from __future__ import annotations

import json
import subprocess
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


def _find_analyzer_script() -> Path:
    """Locate the ts_morph_analyzer.mjs script."""
    return Path(__file__).parent / "ts_morph_analyzer.mjs"


def analyze_frontend(
    frontend_dir: str | Path,
    analysis_run_id: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Run the ts-morph analyzer on a frontend directory.

    Returns (nodes, edges) for the frontend code.
    Uses Node.js subprocess to run the ts-morph analysis.
    """
    frontend_path = Path(frontend_dir)
    script = _find_analyzer_script()

    if not script.exists():
        return [], []

    try:
        result = subprocess.run(
            ["node", str(script), str(frontend_path), analysis_run_id],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return [], []
        raw = json.loads(result.stdout)
    except (subprocess.TimeoutExpired, json.JSONDecodeError, FileNotFoundError):
        return [], []

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    for n in raw.get("nodes", []):
        nodes.append(n)
    for e in raw.get("edges", []):
        edges.append(e)

    return nodes, edges


def resolve_routes_to_backend(
    frontend_nodes: list[dict[str, Any]],
    frontend_edges: list[dict[str, Any]],
    backend_nodes: list[dict[str, Any]],
    analysis_run_id: str,
) -> list[dict[str, Any]]:
    """Match frontend API calls to backend route nodes.

    Produces ROUTES_TO edges connecting frontend API call nodes
    to backend route nodes by matching HTTP method + path.
    """
    # Build index of backend routes
    backend_routes: list[tuple[str, str, str, str]] = []  # (method, path, node_id, source_ref)
    for n in backend_nodes:
        if n["type"] == "route":
            # Route name is "METHOD /path" e.g. "POST /accounts/{account_id}/withdraw"
            route_name = n["name"]
            parts = route_name.split(" ", 1)
            if len(parts) == 2:
                method = parts[0].upper()
                path = parts[1]
                backend_routes.append((method, path, n["id"], f"{n['file']}:{n['lineStart']}"))

    new_edges: list[dict[str, Any]] = []

    for n in frontend_nodes:
        meta = n.get("metadata", {})
        if meta.get("kind") != "api-call":
            continue

        fe_method = meta.get("method", "").upper()
        fe_url = meta.get("url", "")

        if not fe_method or not fe_url:
            continue

        # Match against backend routes
        for be_method, be_path, be_node_id, be_source_ref in backend_routes:
            if fe_method != be_method:
                continue

            # Normalize paths for comparison
            # Frontend: /accounts/{accountId}/withdraw  or /accounts/{account_id}/withdraw
            # Backend:  /accounts/{account_id}/withdraw
            fe_normalized = _normalize_path(fe_url)
            be_normalized = _normalize_path(be_path)

            if fe_normalized == be_normalized:
                edge = make_edge_with_ids(
                    source=n["id"],
                    target=be_node_id,
                    edge_type="ROUTES_TO",
                    confidence=1.0,
                    analysis_run_id=analysis_run_id,
                    source_ref=n.get("metadata", {}).get("file", n.get("file", "")),
                    source_file=n.get("file", ""),
                    source_line=n.get("lineStart", 0),
                )
                new_edges.append(edge)

    return new_edges


def make_edge_with_ids(
    *,
    source: str,
    target: str,
    edge_type: str,
    confidence: float,
    analysis_run_id: str,
    source_ref: str,
    source_file: str = "",
    source_line: int = 0,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create an edge dict."""
    actual_source_ref = source_ref or f"{source_file}:{source_line}" if source_file else ""
    return {
        "id": _stable_id(file, name, type_) if "file" in locals() else _stable_id(source, target, edge_type),
        "source": source,
        "target": target,
        "type": edge_type,
        "confidence": confidence,
        "analysisRunId": analysis_run_id,
        "sourceRef": actual_source_ref,
        "metadata": metadata or {},
    }


def _normalize_path(path: str) -> str:
    """Normalize a route path for comparison.

    Converts all route parameters to a generic {param} placeholder
    so different param names (accountId, account_id, id) match.
    """
    import re
    # Remove template literal ${...} syntax, replace with {param}
    path = re.sub(r"\$\{(\w+)\}", "{param}", path)
    # Ensure all route params use {param} format
    path = re.sub(r":(\w+)", "{param}", path)
    # Also convert existing {paramName} to generic {param}
    path = re.sub(r"\{(\w+)\}", "{param}", path)
    # Normalize slashes
    path = re.sub(r"/+", "/", path)
    return path.rstrip("/")
