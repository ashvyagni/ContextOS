from __future__ import annotations

import sys
import uuid
from pathlib import Path

# Ensure apps/backend is on the Python path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Query

from analyzers.contextos_parser import parse_contextos, ContextosParseError
from analyzers.python_analyzer import analyze_project
from analyzers.frontend_analyzer import analyze_frontend, resolve_routes_to_backend
from graph.builder import build_graph, graph_to_nodes_edges
from db.database import (
    init_db,
    get_connection,
    upsert_project,
    list_projects,
    create_analysis_run,
    get_analysis_run,
    list_runs,
    complete_run,
    get_nodes_for_run,
    get_edges_for_run,
    get_behaviors,
    publish_graph,
)

app = FastAPI(title="ContextOS API", version="0.1.0")

PROJECTS_DIR = Path(__file__).parent.parent.parent / "reference-apps"
PROJECT_REGISTRY: dict[str, dict] = {}


def _register_projects() -> None:
    """Discover reference apps by scanning the reference-apps directory."""
    if not PROJECTS_DIR.exists():
        return
    for project_dir in sorted(PROJECTS_DIR.iterdir()):
        if not project_dir.is_dir():
            continue
        yaml_path = project_dir / "contextos.yaml"
        if yaml_path.exists():
            project_id = project_dir.name
            PROJECT_REGISTRY[project_id] = {
                "id": project_id,
                "name": project_id.replace("-", " ").title(),
                "rootPath": str(project_dir),
            }


@app.on_event("startup")
def startup() -> None:
    _register_projects()
    conn = get_connection()
    init_db(conn)
    for pid, info in PROJECT_REGISTRY.items():
        upsert_project(conn, info["id"], info["name"], info["rootPath"])
    conn.close()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/projects")
def get_projects():
    conn = get_connection()
    projects = list_projects(conn)
    conn.close()
    return projects


@app.get("/projects/{project_id}/graph")
def get_graph(
    project_id: str,
    runId: str | None = Query(None),
):
    conn = get_connection()

    if runId:
        run = get_analysis_run(conn, runId)
        if not run:
            conn.close()
            raise HTTPException(status_code=404, detail="Analysis run not found")
        target_run_id = runId
    else:
        runs = list_runs(conn, project_id)
        if not runs:
            conn.close()
            raise HTTPException(status_code=404, detail="No analysis runs for this project")
        target_run_id = None
        for r in runs:
            if r["status"] == "completed":
                target_run_id = r["id"]
                break
        if not target_run_id:
            conn.close()
            raise HTTPException(status_code=404, detail="No completed analysis runs")

    nodes = get_nodes_for_run(conn, target_run_id)
    edges = get_edges_for_run(conn, target_run_id)
    behaviors = get_behaviors(conn, project_id)
    conn.close()

    return {
        "runId": target_run_id,
        "nodes": nodes,
        "edges": edges,
        "behaviors": behaviors,
    }


@app.post("/projects/{project_id}/analyze")
def analyze_project_endpoint(project_id: str):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")

    project_info = PROJECT_REGISTRY[project_id]
    root_path = Path(project_info["rootPath"])
    yaml_path = root_path / "contextos.yaml"

    run_id = uuid.uuid4().hex[:12]
    conn = get_connection()
    init_db(conn)
    upsert_project(conn, project_id, project_info["name"], project_info["rootPath"])
    create_analysis_run(conn, run_id, project_id)
    conn.close()

    try:
        config = parse_contextos(yaml_path)
        behaviors = config["behaviors"]

        # Backend analysis
        backend_dir = root_path / "backend"
        if not backend_dir.exists():
            backend_dir = root_path

        backend_nodes, backend_edges = analyze_project(backend_dir, run_id)

        # Frontend analysis (if frontend directory exists)
        frontend_dir = root_path / "frontend"
        frontend_nodes: list = []
        frontend_edges: list = []
        if frontend_dir.exists():
            frontend_nodes, frontend_edges = analyze_frontend(frontend_dir, run_id)

        # Route resolution: match frontend API calls to backend routes
        route_resolution_edges = resolve_routes_to_backend(
            frontend_nodes, frontend_edges, backend_nodes, run_id
        )

        # Combine all nodes and edges
        all_nodes = backend_nodes + frontend_nodes
        all_edges = backend_edges + frontend_edges + route_resolution_edges

        G = build_graph(all_nodes, all_edges, behaviors, run_id)

        conn = get_connection()
        init_db(conn)

        persist_nodes_list, persist_edges_list = graph_to_nodes_edges(G)
        publish_graph(conn, run_id, persist_nodes_list, persist_edges_list, behaviors, project_id)
        conn.close()

        return {
            "runId": run_id,
            "projectId": project_id,
            "status": "completed",
            "nodeCount": len(persist_nodes_list),
            "edgeCount": len(persist_edges_list),
            "behaviorCount": len(behaviors),
            "frontendNodeCount": len(frontend_nodes),
            "routeResolutionEdgeCount": len(route_resolution_edges),
        }

    except ContextosParseError as e:
        conn = get_connection()
        complete_run(conn, run_id, "failed")
        conn.close()
        raise HTTPException(status_code=422, detail=f"Configuration error: {e}")
    except Exception as e:
        try:
            conn = get_connection()
            complete_run(conn, run_id, "failed")
            conn.close()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@app.get("/projects/{project_id}/runs")
def get_runs(project_id: str):
    conn = get_connection()
    runs = list_runs(conn, project_id)
    conn.close()
    return runs


@app.get("/nodes/{node_id}/source")
def get_node_source(node_id: str):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM graph_nodes WHERE id = ?", (node_id,)
    ).fetchone()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="Node not found")

    file_path = Path(rows["file"])
    if not file_path.exists():
        return {
            "id": node_id,
            "file": rows["file"],
            "lineStart": rows["line_start"],
            "lineEnd": rows["line_end"],
            "snippet": None,
            "error": "File not found on disk",
        }

    try:
        source_lines = file_path.read_text().splitlines()
        snippet = "\n".join(
            source_lines[rows["line_start"] - 1 : rows["line_end"]]
        )
    except Exception:
        snippet = None

    return {
        "id": node_id,
        "file": rows["file"],
        "lineStart": rows["line_start"],
        "lineEnd": rows["line_end"],
        "snippet": snippet,
    }
