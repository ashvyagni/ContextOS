from __future__ import annotations

import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
    persist_changeset,
    get_changeset,
    get_latest_changeset_for_project,
    persist_impact_report,
    get_impact_report,
    get_latest_impact_for_project,
    persist_scenario_result,
    get_scenario_results_for_run,
    persist_evidence,
    get_evidence_for_project,
)
from diff.graph_diff import compute_changeset
from impact.analyzer import analyze_impact
from scenarios.registry import get_scenarios_for_project, get_scenario_by_id
from scenarios.executor import execute_scenario
from evidence.builder import build_evidence
from ai.explainer import explain_impact, name_capability
from watcher.file_watcher import FileWatcher

app = FastAPI(title="ContextOS API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECTS_DIR = Path(__file__).parent.parent.parent / "reference-apps"
PROJECT_REGISTRY: dict[str, dict] = {}
WATCHERS: dict[str, FileWatcher] = {}


def _register_projects() -> None:
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


def _run_analysis(project_id: str, changed_files: list[str] | None = None) -> dict:
    """Core analysis pipeline. Returns analysis result dict."""
    if not PROJECT_REGISTRY or project_id not in PROJECT_REGISTRY:
        _register_projects()
        conn = get_connection()
        init_db(conn)
        for pid, info in PROJECT_REGISTRY.items():
            upsert_project(conn, info["id"], info["name"], info["rootPath"])
        conn.close()

    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    project_info = PROJECT_REGISTRY[project_id]
    root_path = Path(project_info["rootPath"])
    yaml_path = root_path / "contextos.yaml"

    run_id = uuid.uuid4().hex[:12]
    parent_run_id = None

    conn = get_connection()
    try:
        init_db(conn)
        upsert_project(conn, project_id, project_info["name"], project_info["rootPath"])

        runs = list_runs(conn, project_id)
        completed_runs = [r for r in runs if r["status"] == "completed"]
        if completed_runs:
            parent_run_id = completed_runs[0]["id"]

        create_analysis_run(conn, run_id, project_id, parent_run_id)
        conn.commit()
    except Exception:
        conn.close()
        raise

    try:
        config = parse_contextos(yaml_path)
        behaviors = config["behaviors"]

        backend_dir = root_path / "backend"
        if not backend_dir.exists():
            backend_dir = root_path

        backend_nodes, backend_edges = analyze_project(backend_dir, run_id)

        frontend_dir = root_path / "frontend"
        frontend_nodes: list = []
        frontend_edges: list = []
        if frontend_dir.exists() and any(
            (frontend_dir / "src").rglob("*.tsx")
            if (frontend_dir / "src").exists()
            else False
        ):
            frontend_nodes, frontend_edges = analyze_frontend(frontend_dir, run_id)

        route_resolution_edges = resolve_routes_to_backend(
            frontend_nodes, frontend_edges, backend_nodes, run_id
        )

        all_nodes = backend_nodes + frontend_nodes
        all_edges = backend_edges + frontend_edges + route_resolution_edges

        G = build_graph(all_nodes, all_edges, behaviors, run_id)
        persist_nodes_list, persist_edges_list = graph_to_nodes_edges(G)
        publish_graph(conn, run_id, persist_nodes_list, persist_edges_list, behaviors, project_id)

        changeset = None
        impact_report = None

        if parent_run_id and changed_files is not None:
            old_nodes = get_nodes_for_run(conn, parent_run_id)
            old_edges = get_edges_for_run(conn, parent_run_id)

            changeset = compute_changeset(
                old_nodes, old_edges,
                persist_nodes_list, persist_edges_list,
                changed_files, run_id,
            )
            persist_changeset(conn, changeset)

            impact_report = analyze_impact(G, changeset, behaviors)
            persist_impact_report(conn, impact_report)

        return {
            "runId": run_id,
            "projectId": project_id,
            "status": "completed",
            "nodeCount": len(persist_nodes_list),
            "edgeCount": len(persist_edges_list),
            "behaviorCount": len(behaviors),
            "frontendNodeCount": len(frontend_nodes),
            "routeResolutionEdgeCount": len(route_resolution_edges),
            "changeSet": changeset,
            "impactReport": impact_report,
        }

    except ContextosParseError as e:
        try:
            complete_run(conn, run_id, "failed")
            conn.commit()
        except Exception:
            pass
        conn.close()
        raise HTTPException(status_code=422, detail=f"Configuration error: {e}")
    except Exception as e:
        try:
            complete_run(conn, run_id, "failed")
            conn.commit()
        except Exception:
            pass
        conn.close()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


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
    try:
        projects = list_projects(conn)
    finally:
        conn.close()
    return projects


@app.get("/projects/{project_id}/graph")
def get_graph(
    project_id: str,
    runId: str | None = Query(None),
):
    conn = get_connection()
    try:
        if runId:
            run = get_analysis_run(conn, runId)
            if not run:
                raise HTTPException(status_code=404, detail="Analysis run not found")
            target_run_id = runId
        else:
            runs = list_runs(conn, project_id)
            if not runs:
                raise HTTPException(status_code=404, detail="No analysis runs for this project")
            target_run_id = None
            for r in runs:
                if r["status"] == "completed":
                    target_run_id = r["id"]
                    break
            if not target_run_id:
                raise HTTPException(status_code=404, detail="No completed analysis runs")

        nodes = get_nodes_for_run(conn, target_run_id)
        edges = get_edges_for_run(conn, target_run_id)
        behaviors = get_behaviors(conn, project_id)
    finally:
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
    return _run_analysis(project_id, changed_files=[])


@app.post("/projects/{project_id}/analyze-with-impact")
def analyze_with_impact(project_id: str, changed_files: list[str] = []):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")
    return _run_analysis(project_id, changed_files=changed_files)


@app.get("/projects/{project_id}/runs")
def get_runs(project_id: str):
    conn = get_connection()
    try:
        runs = list_runs(conn, project_id)
    finally:
        conn.close()
    return runs


@app.get("/nodes/{node_id}/source")
def get_node_source(node_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM graph_nodes WHERE id = %s", (node_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Node not found")

            file_path = Path(row[4])
            line_start = row[5]
            line_end = row[6]

            if not file_path.exists():
                return {
                    "id": node_id,
                    "file": row[4],
                    "lineStart": line_start,
                    "lineEnd": line_end,
                    "snippet": None,
                    "error": "File not found on disk",
                }

            try:
                source_lines = file_path.read_text().splitlines()
                snippet = "\n".join(source_lines[line_start - 1 : line_end])
            except Exception:
                snippet = None

            return {
                "id": node_id,
                "file": row[4],
                "lineStart": line_start,
                "lineEnd": line_end,
                "snippet": snippet,
            }
    finally:
        conn.close()


# --- Change Sets ---

@app.get("/projects/{project_id}/changesets")
def get_changesets(project_id: str):
    conn = get_connection()
    try:
        cs = get_latest_changeset_for_project(conn, project_id)
    finally:
        conn.close()
    return cs or []


# --- Impact Reports ---

@app.get("/projects/{project_id}/impact")
def get_impact(project_id: str):
    conn = get_connection()
    try:
        report = get_latest_impact_for_project(conn, project_id)
    finally:
        conn.close()
    return report or {}


# --- Scenarios ---

@app.get("/projects/{project_id}/scenarios")
def list_scenarios(project_id: str):
    return get_scenarios_for_project(project_id)


@app.post("/projects/{project_id}/scenarios/{scenario_id}/run")
def run_scenario(project_id: str, scenario_id: str):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")

    scenario = get_scenario_by_id(project_id, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    project_info = PROJECT_REGISTRY[project_id]
    run_id = uuid.uuid4().hex[:12]

    conn = get_connection()
    try:
        create_analysis_run(conn, run_id, project_id)
        conn.commit()
    except Exception:
        conn.close()
        raise

    try:
        result = execute_scenario(scenario, project_info["rootPath"], run_id)
        persist_scenario_result(conn, result)
        complete_run(conn, run_id, "completed")
        conn.commit()
        return result
    except Exception as e:
        try:
            complete_run(conn, run_id, "failed")
            conn.commit()
        except Exception:
            pass
        conn.close()
        raise HTTPException(status_code=500, detail=f"Scenario execution failed: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.post("/projects/{project_id}/scenarios/run-all")
def run_all_scenarios(project_id: str):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")

    scenarios = get_scenarios_for_project(project_id)
    if not scenarios:
        return {"results": [], "message": "No scenarios defined for this project"}

    project_info = PROJECT_REGISTRY[project_id]
    run_id = uuid.uuid4().hex[:12]

    conn = get_connection()
    try:
        create_analysis_run(conn, run_id, project_id)
        conn.commit()
    except Exception:
        conn.close()
        raise

    results = []
    try:
        for scenario in scenarios:
            result = execute_scenario(scenario, project_info["rootPath"], run_id)
            persist_scenario_result(conn, result)
            results.append(result)

        complete_run(conn, run_id, "completed")
        conn.commit()
        return {"runId": run_id, "results": results}
    except Exception as e:
        try:
            complete_run(conn, run_id, "failed")
            conn.commit()
        except Exception:
            pass
        conn.close()
        raise HTTPException(status_code=500, detail=f"Scenario execution failed: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass


@app.get("/projects/{project_id}/scenario-results")
def get_scenario_results(project_id: str, runId: str | None = Query(None)):
    conn = get_connection()
    try:
        if runId:
            results = get_scenario_results_for_run(conn, runId)
        else:
            runs = list_runs(conn, project_id)
            completed = [r for r in runs if r["status"] == "completed"]
            if completed:
                results = get_scenario_results_for_run(conn, completed[0]["id"])
            else:
                results = []
    finally:
        conn.close()
    return results


# --- Evidence ---

@app.get("/projects/{project_id}/evidence")
def get_evidence(project_id: str):
    conn = get_connection()
    try:
        items = get_evidence_for_project(conn, project_id)
    finally:
        conn.close()
    return items


@app.post("/projects/{project_id}/build-evidence")
def build_evidence_endpoint(project_id: str):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")

    conn = get_connection()
    try:
        changeset = get_latest_changeset_for_project(conn, project_id)
        impact_report = get_latest_impact_for_project(conn, project_id)
        behaviors = get_behaviors(conn, project_id)

        if not changeset or not impact_report:
            return {"evidence": [], "message": "No changeset or impact report available"}

        runs = list_runs(conn, project_id)
        completed = [r for r in runs if r["status"] == "completed"]
        scenario_results = []
        if completed:
            scenario_results = get_scenario_results_for_run(conn, completed[0]["id"])

        evidence_items = build_evidence(
            changeset, impact_report, scenario_results, behaviors, project_id
        )

        for ev in evidence_items:
            persist_evidence(conn, ev)

        return {"evidence": evidence_items}
    finally:
        conn.close()


# --- AI Explanation ---

@app.post("/projects/{project_id}/explain")
def explain_endpoint(project_id: str):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")

    conn = get_connection()
    try:
        changeset = get_latest_changeset_for_project(conn, project_id)
        impact_report = get_latest_impact_for_project(conn, project_id)
        behaviors = get_behaviors(conn, project_id)

        if not changeset or not impact_report:
            return {
                "overallConclusion": "No analysis data available. Run analysis first.",
                "behaviorExplanations": [],
                "evidenceSummary": [],
            }

        runs = list_runs(conn, project_id)
        completed = [r for r in runs if r["status"] == "completed"]
        scenario_results = []
        if completed:
            scenario_results = get_scenario_results_for_run(conn, completed[0]["id"])

        evidence_items = build_evidence(
            changeset, impact_report, scenario_results, behaviors, project_id
        )

        explanation = explain_impact(impact_report, changeset, evidence_items, behaviors)
        return explanation
    finally:
        conn.close()


# --- File Watcher ---

@app.get("/watcher/status")
def watcher_status(project_id: str | None = Query(None)):
    if project_id and project_id in WATCHERS:
        return WATCHERS[project_id].get_status()
    return {"running": False, "watchedFiles": 0}


@app.post("/watcher/start/{project_id}")
def start_watcher(project_id: str):
    if project_id not in PROJECT_REGISTRY:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_id in WATCHERS and WATCHERS[project_id]._running:
        return {"status": "already_running", **WATCHERS[project_id].get_status()}

    project_info = PROJECT_REGISTRY[project_id]

    def on_change(changed_files: list[str]):
        try:
            _run_analysis(project_id, changed_files)
        except Exception as e:
            print(f"[Watcher] Auto-analysis failed for {project_id}: {e}")

    watcher = FileWatcher(
        project_root=project_info["rootPath"],
        on_change=on_change,
        debounce_seconds=3.0,
    )
    watcher.start()
    WATCHERS[project_id] = watcher
    return {"status": "started", **watcher.get_status()}


@app.post("/watcher/stop/{project_id}")
def stop_watcher(project_id: str):
    if project_id in WATCHERS:
        WATCHERS[project_id].stop()
        del WATCHERS[project_id]
        return {"status": "stopped"}
    return {"status": "not_running"}
