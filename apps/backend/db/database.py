from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# Load .env from the repo root
_env_path = Path(__file__).parent.parent.parent.parent / ".env"
load_dotenv(_env_path)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://localhost:5432/contextos")


def get_connection(db_url: str | None = None):
    """Get a PostgreSQL connection."""
    url = db_url or DB_URL
    conn = psycopg2.connect(url)
    conn.autocommit = False
    return conn


def init_db(conn) -> None:
    """Create all required tables if they don't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT NOT NULL,
                name TEXT NOT NULL,
                root_path TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS analysis_runs (
                id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                status TEXT NOT NULL DEFAULT 'pending',
                parent_run_id TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS graph_nodes (
                id TEXT NOT NULL,
                analysis_run_id TEXT NOT NULL,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                file TEXT NOT NULL,
                line_start INTEGER NOT NULL,
                line_end INTEGER NOT NULL,
                language TEXT NOT NULL,
                behavior_id TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
            );

            CREATE TABLE IF NOT EXISTS graph_edges (
                id TEXT NOT NULL,
                analysis_run_id TEXT NOT NULL,
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                type TEXT NOT NULL,
                confidence REAL NOT NULL DEFAULT 1.0,
                source_ref TEXT NOT NULL,
                metadata TEXT NOT NULL DEFAULT '{}',
                FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
            );

            CREATE TABLE IF NOT EXISTS behaviors (
                id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '',
                entrypoints TEXT NOT NULL DEFAULT '[]',
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS change_sets (
                id TEXT NOT NULL,
                analysis_run_id TEXT NOT NULL,
                changed_files TEXT NOT NULL DEFAULT '[]',
                added_node_ids TEXT NOT NULL DEFAULT '[]',
                removed_node_ids TEXT NOT NULL DEFAULT '[]',
                modified_node_ids TEXT NOT NULL DEFAULT '[]',
                added_edge_count INTEGER NOT NULL DEFAULT 0,
                removed_edge_count INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS impact_reports (
                id TEXT NOT NULL,
                change_set_id TEXT NOT NULL,
                affected_behavior_ids TEXT NOT NULL DEFAULT '[]',
                affected_node_ids TEXT NOT NULL DEFAULT '[]',
                risk_score REAL NOT NULL DEFAULT 0.0,
                risk_explanation TEXT NOT NULL DEFAULT '',
                path TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS scenario_results (
                id TEXT NOT NULL,
                scenario_id TEXT NOT NULL,
                analysis_run_id TEXT NOT NULL,
                status TEXT NOT NULL,
                duration_ms INTEGER NOT NULL DEFAULT 0,
                stdout TEXT NOT NULL DEFAULT '',
                stderr TEXT NOT NULL DEFAULT '',
                confirmed_regression BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS evidence (
                id TEXT NOT NULL,
                scenario_result_id TEXT,
                capability_candidate_id TEXT,
                summary TEXT NOT NULL,
                kind TEXT NOT NULL,
                details TEXT NOT NULL DEFAULT '{}',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        """)
    conn.commit()


# --- Projects ---

def upsert_project(
    conn,
    project_id: str,
    name: str,
    root_path: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO projects (id, name, root_path, created_at)
               VALUES (%s, %s, %s, NOW())
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, root_path = EXCLUDED.root_path""",
            (project_id, name, root_path),
        )
    conn.commit()


def get_project(conn, project_id: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM projects WHERE id = %s", (project_id,))
        row = cur.fetchone()
        if row:
            return dict(row)
        return None


def list_projects(conn) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM projects ORDER BY name")
        return [dict(r) for r in cur.fetchall()]


# --- Analysis Runs ---

def create_analysis_run(
    conn,
    run_id: str,
    project_id: str,
    parent_run_id: str | None = None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO analysis_runs (id, project_id, created_at, status, parent_run_id)
               VALUES (%s, %s, NOW(), 'running', %s)""",
            (run_id, project_id, parent_run_id),
        )
    conn.commit()
    return {
        "id": run_id,
        "projectId": project_id,
        "status": "running",
        "parentRunId": parent_run_id,
    }


def complete_run(conn, run_id: str, status: str = "completed") -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE analysis_runs SET status = %s WHERE id = %s",
            (status, run_id),
        )
    conn.commit()


def get_analysis_run(conn, run_id: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM analysis_runs WHERE id = %s", (run_id,))
        row = cur.fetchone()
        if row:
            return dict(row)
        return None


def list_runs(conn, project_id: str) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM analysis_runs WHERE project_id = %s ORDER BY created_at DESC",
            (project_id,),
        )
        return [dict(r) for r in cur.fetchall()]


# --- Graph Nodes ---

def persist_nodes(
    conn,
    nodes: list[dict[str, Any]],
    analysis_run_id: str,
) -> None:
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO graph_nodes (id, analysis_run_id, type, name, file, line_start, line_end, language, behavior_id, metadata)
               VALUES (%(id)s, %(analysis_run_id)s, %(type)s, %(name)s, %(file)s, %(line_start)s, %(line_end)s, %(language)s, %(behavior_id)s, %(metadata)s)""",
            [
                {
                    "id": n["id"],
                    "analysis_run_id": analysis_run_id,
                    "type": n["type"],
                    "name": n["name"],
                    "file": n["file"],
                    "line_start": n["lineStart"],
                    "line_end": n["lineEnd"],
                    "language": n["language"],
                    "behavior_id": n.get("behaviorId"),
                    "metadata": json.dumps(n.get("metadata", {})),
                }
                for n in nodes
            ],
        )
    conn.commit()


def get_nodes_for_run(conn, analysis_run_id: str) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM graph_nodes WHERE analysis_run_id = %s", (analysis_run_id,)
        )
        return [
            {
                "id": r["id"],
                "type": r["type"],
                "name": r["name"],
                "file": r["file"],
                "lineStart": r["line_start"],
                "lineEnd": r["line_end"],
                "language": r["language"],
                "behaviorId": r["behavior_id"],
                "analysisRunId": r["analysis_run_id"],
                "metadata": json.loads(r["metadata"]),
            }
            for r in cur.fetchall()
        ]


# --- Graph Edges ---

def persist_edges(
    conn,
    edges: list[dict[str, Any]],
    analysis_run_id: str,
) -> None:
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO graph_edges (id, analysis_run_id, source, target, type, confidence, source_ref, metadata)
               VALUES (%(id)s, %(analysis_run_id)s, %(source)s, %(target)s, %(type)s, %(confidence)s, %(source_ref)s, %(metadata)s)""",
            [
                {
                    "id": e["id"],
                    "analysis_run_id": analysis_run_id,
                    "source": e["source"],
                    "target": e["target"],
                    "type": e["type"],
                    "confidence": e["confidence"],
                    "source_ref": e["sourceRef"],
                    "metadata": json.dumps(e.get("metadata", {})),
                }
                for e in edges
            ],
        )
    conn.commit()


def get_edges_for_run(conn, analysis_run_id: str) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM graph_edges WHERE analysis_run_id = %s", (analysis_run_id,)
        )
        return [
            {
                "id": r["id"],
                "source": r["source"],
                "target": r["target"],
                "type": r["type"],
                "confidence": r["confidence"],
                "analysisRunId": r["analysis_run_id"],
                "sourceRef": r["source_ref"],
                "metadata": json.loads(r["metadata"]),
            }
            for r in cur.fetchall()
        ]


# --- Behaviors ---

def persist_behaviors(
    conn,
    behaviors: list[dict[str, Any]],
    project_id: str,
) -> None:
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO behaviors (id, project_id, name, category, entrypoints)
               VALUES (%(id)s, %(project_id)s, %(name)s, %(category)s, %(entrypoints)s)
               ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   category = EXCLUDED.category,
                   entrypoints = EXCLUDED.entrypoints""",
            [
                {
                    "id": b["id"],
                    "project_id": project_id,
                    "name": b["name"],
                    "category": b.get("category", ""),
                    "entrypoints": json.dumps(b.get("entrypoints", [])),
                }
                for b in behaviors
            ],
        )
    conn.commit()


def get_behaviors(conn, project_id: str) -> list[dict[str, Any]]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM behaviors WHERE project_id = %s", (project_id,)
        )
        return [
            {
                "id": r["id"],
                "name": r["name"],
                "category": r["category"],
                "entrypoints": json.loads(r["entrypoints"]),
                "projectId": r["project_id"],
            }
            for r in cur.fetchall()
        ]


# --- Atomic Graph Publication ---

def publish_graph(
    conn,
    analysis_run_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    behaviors: list[dict[str, Any]],
    project_id: str,
) -> None:
    """Atomically persist a complete graph for an analysis run.

    All data is written in a single transaction. If any step fails,
    the previous graph remains intact.
    """
    try:
        persist_nodes(conn, nodes, analysis_run_id)
        persist_edges(conn, edges, analysis_run_id)
        persist_behaviors(conn, behaviors, project_id)
        complete_run(conn, analysis_run_id, "completed")
        conn.commit()
    except Exception:
        conn.rollback()
        complete_run(conn, analysis_run_id, "failed")
        raise


# --- Change Sets ---

def persist_changeset(conn, changeset: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO change_sets (id, analysis_run_id, changed_files, added_node_ids,
               removed_node_ids, modified_node_ids, added_edge_count, removed_edge_count)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                changeset["id"],
                changeset["analysisRunId"],
                json.dumps(changeset.get("changedFiles", [])),
                json.dumps(changeset.get("addedNodeIds", [])),
                json.dumps(changeset.get("removedNodeIds", [])),
                json.dumps(changeset.get("modifiedNodeIds", [])),
                changeset.get("addedEdgeCount", 0),
                changeset.get("removedEdgeCount", 0),
            ),
        )
    conn.commit()


def get_changeset(conn, changeset_id: str) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM change_sets WHERE id = %s", (changeset_id,))
        row = cur.fetchone()
        if row:
            return {
                "id": row["id"],
                "analysisRunId": row["analysis_run_id"],
                "changedFiles": json.loads(row["changed_files"]),
                "addedNodeIds": json.loads(row["added_node_ids"]),
                "removedNodeIds": json.loads(row["removed_node_ids"]),
                "modifiedNodeIds": json.loads(row["modified_node_ids"]),
                "addedEdgeCount": row["added_edge_count"],
                "removedEdgeCount": row["removed_edge_count"],
            }
        return None


def get_latest_changeset_for_project(conn, project_id: str) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT cs.* FROM change_sets cs
               JOIN analysis_runs ar ON cs.analysis_run_id = ar.id
               WHERE ar.project_id = %s
               ORDER BY cs.created_at DESC LIMIT 1""",
            (project_id,),
        )
        row = cur.fetchone()
        if row:
            return {
                "id": row["id"],
                "analysisRunId": row["analysis_run_id"],
                "changedFiles": json.loads(row["changed_files"]),
                "addedNodeIds": json.loads(row["added_node_ids"]),
                "removedNodeIds": json.loads(row["removed_node_ids"]),
                "modifiedNodeIds": json.loads(row["modified_node_ids"]),
                "addedEdgeCount": row["added_edge_count"],
                "removedEdgeCount": row["removed_edge_count"],
            }
        return None


# --- Impact Reports ---

def persist_impact_report(conn, report: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO impact_reports (id, change_set_id, affected_behavior_ids,
               affected_node_ids, risk_score, risk_explanation, path)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (
                report["id"],
                report["changeSetId"],
                json.dumps(report.get("affectedBehaviorIds", [])),
                json.dumps(report.get("affectedNodeIds", [])),
                report.get("riskScore", 0),
                report.get("riskExplanation", ""),
                json.dumps(report.get("path", [])),
            ),
        )
    conn.commit()


def get_impact_report(conn, report_id: str) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM impact_reports WHERE id = %s", (report_id,))
        row = cur.fetchone()
        if row:
            return {
                "id": row["id"],
                "changeSetId": row["change_set_id"],
                "affectedBehaviorIds": json.loads(row["affected_behavior_ids"]),
                "affectedNodeIds": json.loads(row["affected_node_ids"]),
                "riskScore": row["risk_score"],
                "riskExplanation": row["risk_explanation"],
                "path": json.loads(row["path"]),
            }
        return None


def get_latest_impact_for_project(conn, project_id: str) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT ir.* FROM impact_reports ir
               JOIN change_sets cs ON ir.change_set_id = cs.id
               JOIN analysis_runs ar ON cs.analysis_run_id = ar.id
               WHERE ar.project_id = %s
               ORDER BY ir.created_at DESC LIMIT 1""",
            (project_id,),
        )
        row = cur.fetchone()
        if row:
            return {
                "id": row["id"],
                "changeSetId": row["change_set_id"],
                "affectedBehaviorIds": json.loads(row["affected_behavior_ids"]),
                "affectedNodeIds": json.loads(row["affected_node_ids"]),
                "riskScore": row["risk_score"],
                "riskExplanation": row["risk_explanation"],
                "path": json.loads(row["path"]),
            }
        return None


# --- Scenario Results ---

def persist_scenario_result(conn, result: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO scenario_results (id, scenario_id, analysis_run_id, status,
               duration_ms, stdout, stderr, confirmed_regression)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                result["id"],
                result["scenarioId"],
                result["analysisRunId"],
                result["status"],
                result.get("durationMs", 0),
                result.get("stdout", ""),
                result.get("stderr", ""),
                result.get("confirmedRegression", False),
            ),
        )
    conn.commit()


def get_scenario_results_for_run(conn, analysis_run_id: str) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM scenario_results WHERE analysis_run_id = %s ORDER BY created_at",
            (analysis_run_id,),
        )
        return [
            {
                "id": r["id"],
                "scenarioId": r["scenario_id"],
                "analysisRunId": r["analysis_run_id"],
                "status": r["status"],
                "durationMs": r["duration_ms"],
                "stdout": r["stdout"],
                "stderr": r["stderr"],
                "confirmedRegression": r["confirmed_regression"],
            }
            for r in cur.fetchall()
        ]


# --- Evidence ---

def persist_evidence(conn, ev: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO evidence (id, scenario_result_id, capability_candidate_id,
               summary, kind, details)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                ev["id"],
                ev.get("scenarioResultId") or None,
                ev.get("capabilityCandidateId") or None,
                ev["summary"],
                ev["kind"],
                json.dumps(ev.get("details", {})),
            ),
        )
    conn.commit()


def get_evidence_for_project(conn, project_id: str) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT e.* FROM evidence e
               LEFT JOIN scenario_results sr ON e.scenario_result_id = sr.id
               LEFT JOIN analysis_runs ar ON sr.analysis_run_id = ar.id
               WHERE ar.project_id = %s
               ORDER BY e.created_at DESC LIMIT 50""",
            (project_id,),
        )
        return [
            {
                "id": r["id"],
                "scenarioResultId": r["scenario_result_id"],
                "capabilityCandidateId": r["capability_candidate_id"],
                "summary": r["summary"],
                "kind": r["kind"],
                "details": json.loads(r["details"]),
            }
            for r in cur.fetchall()
        ]


# --- Cleanup ---

def cleanup_db(conn=None) -> None:
    """Drop all tables (for testing)."""
    if conn is None:
        conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("DROP TABLE IF EXISTS evidence CASCADE")
        cur.execute("DROP TABLE IF EXISTS scenario_results CASCADE")
        cur.execute("DROP TABLE IF EXISTS impact_reports CASCADE")
        cur.execute("DROP TABLE IF EXISTS change_sets CASCADE")
        cur.execute("DROP TABLE IF EXISTS graph_edges CASCADE")
        cur.execute("DROP TABLE IF EXISTS graph_nodes CASCADE")
        cur.execute("DROP TABLE IF EXISTS behaviors CASCADE")
        cur.execute("DROP TABLE IF EXISTS analysis_runs CASCADE")
        cur.execute("DROP TABLE IF EXISTS projects CASCADE")
    conn.commit()
