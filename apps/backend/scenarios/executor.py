from __future__ import annotations

import subprocess
import time
import uuid
from pathlib import Path
from typing import Any


def execute_scenario(
    scenario: dict[str, Any],
    project_root: str,
    analysis_run_id: str,
) -> dict[str, Any]:
    """Execute a pytest scenario against a reference app.

    Runs the test as a subprocess and captures the result.
    """
    result_id = f"sr-{uuid.uuid4().hex[:12]}"
    start_time = time.time()

    test_path = Path(project_root) / scenario["entrypoint"].split("::")[0]
    test_name = scenario["entrypoint"].split("::")[1] if "::" in scenario["entrypoint"] else None

    cmd = ["python3", "-m", "pytest"]
    if test_name:
        cmd.extend([str(test_path), "-k", test_name, "-v"])
    else:
        cmd.extend([str(test_path), "-v"])

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=project_root,
        )
        duration_ms = int((time.time() - start_time) * 1000)
        status = "pass" if proc.returncode == 0 else "fail"
        confirmed_regression = status == "fail"

        return {
            "id": result_id,
            "scenarioId": scenario["id"],
            "analysisRunId": analysis_run_id,
            "status": status,
            "durationMs": duration_ms,
            "stdout": proc.stdout[-2000:] if proc.stdout else "",
            "stderr": proc.stderr[-1000:] if proc.stderr else "",
            "confirmedRegression": confirmed_regression,
        }
    except subprocess.TimeoutExpired:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "id": result_id,
            "scenarioId": scenario["id"],
            "analysisRunId": analysis_run_id,
            "status": "fail",
            "durationMs": duration_ms,
            "stdout": "",
            "stderr": "Scenario execution timed out after 30 seconds",
            "confirmedRegression": True,
        }
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "id": result_id,
            "scenarioId": scenario["id"],
            "analysisRunId": analysis_run_id,
            "status": "fail",
            "durationMs": duration_ms,
            "stdout": "",
            "stderr": str(e),
            "confirmedRegression": True,
        }
