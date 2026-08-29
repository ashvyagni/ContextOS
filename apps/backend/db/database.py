from __future__ import annotations

import json
import sqlite3
import uuid
from pathlib import Path
from typing import Any


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


DB_PATH = Path(__file__).parent.parent / "contextos.db"


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    """Create all required tables."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            root_path TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS analysis_runs (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            parent_run_id TEXT,
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );

        CREATE TABLE IF NOT EXISTS graph_nodes (
            id TEXT PRIMARY KEY,
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
            id TEXT PRIMARY KEY,
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
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT '',
            entrypoints TEXT NOT NULL DEFAULT '[]',
            FOREIGN KEY (project_id) REFERENCES projects(id)
        );
    """)
    conn.commit()


# --- Projects ---

def upsert_project(
    conn: sqlite3.Connection,
    project_id: str,
    name: str,
    root_path: str,
) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO projects (id, name, root_path, created_at) VALUES (?, ?, ?, datetime('now'))",
        (project_id, name, root_path),
    )
    conn.commit()


def get_project(conn: sqlite3.Connection, project_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if row:
        return dict(row)
    return None


def list_projects(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT * FROM projects ORDER BY name").fetchall()
    return [dict(r) for r in rows]


# --- Analysis Runs ---

def create_analysis_run(
    conn: sqlite3.Connection,
    run_id: str,
    project_id: str,
    parent_run_id: str | None = None,
) -> dict[str, Any]:
    conn.execute(
        "INSERT INTO analysis_runs (id, project_id, created_at, status, parent_run_id) VALUES (?, ?, datetime('now'), 'running', ?)",
        (run_id, project_id, parent_run_id),
    )
    conn.commit()
    return {
        "id": run_id,
        "projectId": project_id,
        "status": "running",
        "parentRunId": parent_run_id,
    }


def complete_run(conn: sqlite3.Connection, run_id: str, status: str = "completed") -> None:
    conn.execute(
        "UPDATE analysis_runs SET status = ? WHERE id = ?",
        (status, run_id),
    )
    conn.commit()


def get_analysis_run(conn: sqlite3.Connection, run_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM analysis_runs WHERE id = ?", (run_id,)).fetchone()
    if row:
        return dict(row)
    return None


def list_runs(conn: sqlite3.Connection, project_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM analysis_runs WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,),
    ).fetchall()
    return [dict(r) for r in rows]


# --- Graph Nodes ---

def persist_nodes(
    conn: sqlite3.Connection,
    nodes: list[dict[str, Any]],
    analysis_run_id: str,
) -> None:
    conn.executemany(
        """INSERT INTO graph_nodes (id, analysis_run_id, type, name, file, line_start, line_end, language, behavior_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                n["id"],
                analysis_run_id,
                n["type"],
                n["name"],
                n["file"],
                n["lineStart"],
                n["lineEnd"],
                n["language"],
                n.get("behaviorId"),
                json.dumps(n.get("metadata", {})),
            )
            for n in nodes
        ],
    )
    conn.commit()


def get_nodes_for_run(conn: sqlite3.Connection, analysis_run_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM graph_nodes WHERE analysis_run_id = ?", (analysis_run_id,)
    ).fetchall()
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
        for r in rows
    ]


# --- Graph Edges ---

def persist_edges(
    conn: sqlite3.Connection,
    edges: list[dict[str, Any]],
    analysis_run_id: str,
) -> None:
    conn.executemany(
        """INSERT INTO graph_edges (id, analysis_run_id, source, target, type, confidence, source_ref, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                e["id"],
                analysis_run_id,
                e["source"],
                e["target"],
                e["type"],
                e["confidence"],
                e["sourceRef"],
                json.dumps(e.get("metadata", {})),
            )
            for e in edges
        ],
    )
    conn.commit()


def get_edges_for_run(conn: sqlite3.Connection, analysis_run_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM graph_edges WHERE analysis_run_id = ?", (analysis_run_id,)
    ).fetchall()
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
        for r in rows
    ]


# --- Behaviors ---

def persist_behaviors(
    conn: sqlite3.Connection,
    behaviors: list[dict[str, Any]],
    project_id: str,
) -> None:
    conn.executemany(
        """INSERT OR REPLACE INTO behaviors (id, project_id, name, category, entrypoints)
        VALUES (?, ?, ?, ?, ?)""",
        [
            (
                b["id"],
                project_id,
                b["name"],
                b.get("category", ""),
                json.dumps(b.get("entrypoints", [])),
            )
            for b in behaviors
        ],
    )
    conn.commit()


def get_behaviors(conn: sqlite3.Connection, project_id: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        "SELECT * FROM behaviors WHERE project_id = ?", (project_id,)
    ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "entrypoints": json.loads(r["entrypoints"]),
            "projectId": r["project_id"],
        }
        for r in rows
    ]


# --- Atomic Graph Publication ---

def publish_graph(
    conn: sqlite3.Connection,
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
        conn.execute("BEGIN")
        persist_nodes(conn, nodes, analysis_run_id)
        persist_edges(conn, edges, analysis_run_id)
        persist_behaviors(conn, behaviors, project_id)
        complete_run(conn, analysis_run_id, "completed")
        conn.commit()
    except Exception:
        conn.rollback()
        complete_run(conn, analysis_run_id, "failed")
        raise


# --- Cleanup ---

def cleanup_db(db_path: Path | None = None) -> None:
    """Remove the database file."""
    path = db_path or DB_PATH
    if path.exists():
        path.unlink()
