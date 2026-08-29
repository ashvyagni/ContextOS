import subprocess
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
BANKING_FRONTEND_DIR = PROJECT_ROOT / "reference-apps" / "banking" / "frontend"
MAIN_APP_DIR = PROJECT_ROOT / "apps" / "frontend"


class TestFrontendBuildVerification:
    def test_banking_frontend_builds(self):
        """Verify the Banking reference frontend compiles successfully."""
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(BANKING_FRONTEND_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, f"Banking frontend build failed:\n{result.stderr}"
        dist_dir = BANKING_FRONTEND_DIR / "dist"
        assert dist_dir.exists(), "dist directory was not created"

    def test_main_app_builds(self):
        """Verify the main ContextOS frontend compiles successfully."""
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(MAIN_APP_DIR),
            capture_output=True,
            text=True,
            timeout=60,
        )
        assert result.returncode == 0, f"Main app build failed:\n{result.stderr}"
        dist_dir = MAIN_APP_DIR / "dist"
        assert dist_dir.exists(), "dist directory was not created"
