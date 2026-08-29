import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from analyzers.contextos_parser import parse_contextos, ContextosParseError

FIXTURES = Path(__file__).parent / "fixtures"


class TestContextosParser:
    def test_valid_config(self):
        result = parse_contextos(FIXTURES / "valid_contextos.yaml")
        assert result["project"] == "banking"
        assert len(result["behaviors"]) == 2

    def test_valid_behavior_fields(self):
        result = parse_contextos(FIXTURES / "valid_contextos.yaml")
        b = result["behaviors"][0]
        assert b["id"] == "withdraw"
        assert b["name"] == "Withdraw"
        assert b["category"] == "transaction"
        assert len(b["entrypoints"]) == 1
        assert b["projectId"] == "banking"

    def test_multiple_behaviors(self):
        result = parse_contextos(FIXTURES / "valid_contextos.yaml")
        ids = [b["id"] for b in result["behaviors"]]
        assert "withdraw" in ids
        assert "deposit" in ids

    def test_entrypoints_preserved(self):
        result = parse_contextos(FIXTURES / "valid_contextos.yaml")
        ep = result["behaviors"][0]["entrypoints"][0]
        assert "POST" in ep
        assert "/accounts" in ep

    def test_missing_file(self):
        with pytest.raises(ContextosParseError, match="not found"):
            parse_contextos(FIXTURES / "nonexistent.yaml")

    def test_malformed_yaml(self):
        with pytest.raises(ContextosParseError, match="Malformed YAML"):
            parse_contextos(FIXTURES / "malformed.yaml")

    def test_not_mapping(self):
        with pytest.raises(ContextosParseError, match="must be a mapping"):
            parse_contextos(FIXTURES / "not_mapping.yaml")

    def test_missing_entrypoints(self):
        with pytest.raises(ContextosParseError, match="missing 'entrypoints'"):
            parse_contextos(FIXTURES / "missing_entrypoints.yaml")

    def test_missing_project_field(self):
        tmp = FIXTURES / "_tmp_no_project.yaml"
        tmp.write_text("behaviors:\n  - id: test\n    name: Test\n")
        try:
            with pytest.raises(ContextosParseError, match="Missing.*'project'"):
                parse_contextos(tmp)
        finally:
            tmp.unlink()

    def test_missing_behaviors_field(self):
        tmp = FIXTURES / "_tmp_no_behaviors.yaml"
        tmp.write_text("project: test\n")
        try:
            with pytest.raises(ContextosParseError, match="Missing.*'behaviors'"):
                parse_contextos(tmp)
        finally:
            tmp.unlink()

    def test_behavior_missing_id(self):
        tmp = FIXTURES / "_tmp_no_id.yaml"
        tmp.write_text("project: test\nbehaviors:\n  - name: Test\n")
        try:
            with pytest.raises(ContextosParseError, match="missing 'id'"):
                parse_contextos(tmp)
        finally:
            tmp.unlink()

    def test_behavior_missing_name(self):
        tmp = FIXTURES / "_tmp_no_name.yaml"
        tmp.write_text("project: test\nbehaviors:\n  - id: test\n")
        try:
            with pytest.raises(ContextosParseError, match="missing 'name'"):
                parse_contextos(tmp)
        finally:
            tmp.unlink()
