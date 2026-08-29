from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

import yaml


class ContextosParseError(Exception):
    """Raised when contextos.yaml is malformed or missing required fields."""


def _generate_id() -> str:
    return uuid.uuid4().hex[:12]


def parse_contextos(
    yaml_path: str | Path,
) -> dict[str, Any]:
    """Parse a contextos.yaml file and return the raw validated dict.

    Returns:
        {
            "project": str,
            "behaviors": [
                {
                    "id": str,
                    "name": str,
                    "category": str,
                    "entrypoints": [str],
                    "projectId": str,
                }
            ]
        }
    """
    path = Path(yaml_path)
    if not path.exists():
        raise ContextosParseError(f"contextos.yaml not found: {path}")

    try:
        with open(path) as f:
            raw = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise ContextosParseError(f"Malformed YAML: {e}") from e

    if not isinstance(raw, dict):
        raise ContextosParseError("contextos.yaml must be a mapping")

    project = raw.get("project")
    if not project or not isinstance(project, str):
        raise ContextosParseError("Missing or invalid 'project' field")

    raw_behaviors = raw.get("behaviors")
    if not isinstance(raw_behaviors, list):
        raise ContextosParseError("Missing or invalid 'behaviors' list")

    behaviors = []
    for i, b in enumerate(raw_behaviors):
        if not isinstance(b, dict):
            raise ContextosParseError(f"Behavior at index {i} is not a mapping")
        bid = b.get("id")
        name = b.get("name")
        category = b.get("category", "")

        if not bid or not isinstance(bid, str):
            raise ContextosParseError(f"Behavior at index {i} missing 'id'")
        if not name or not isinstance(name, str):
            raise ContextosParseError(f"Behavior '{bid}' missing 'name'")
        if "entrypoints" not in b:
            raise ContextosParseError(f"Behavior '{bid}' missing 'entrypoints'")
        entrypoints = b["entrypoints"]
        if not isinstance(entrypoints, list):
            raise ContextosParseError(f"Behavior '{bid}' entrypoints must be a list")

        behaviors.append({
            "id": bid,
            "name": name,
            "category": category,
            "entrypoints": entrypoints,
            "projectId": project,
        })

    return {
        "project": project,
        "behaviors": behaviors,
    }
