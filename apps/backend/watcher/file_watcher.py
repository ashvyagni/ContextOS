from __future__ import annotations

import json
import time
import threading
from pathlib import Path
from typing import Callable

WATCH_EXTENSIONS = {".py", ".ts", ".tsx", ".js", ".jsx"}


class FileWatcher:
    """Watches a project directory for source file changes with debouncing."""

    def __init__(
        self,
        project_root: str,
        on_change: Callable[[list[str]], None],
        debounce_seconds: float = 2.0,
    ):
        self.project_root = Path(project_root)
        self.on_change = on_change
        self.debounce_seconds = debounce_seconds
        self._file_mtimes: dict[str, float] = {}
        self._running = False
        self._thread: threading.Thread | None = None
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()
        self._pending_files: set[str] = set()

    def _snapshot_mtimes(self) -> dict[str, float]:
        """Capture current modification times of all relevant source files."""
        mtimes: dict[str, float] = {}
        for ext in WATCH_EXTENSIONS:
            for f in self.project_root.rglob(f"*{ext}"):
                if any(
                    part.startswith(".")
                    or part in ("node_modules", "__pycache__", "dist", ".venv", "venv")
                    for part in f.parts
                ):
                    continue
                try:
                    mtimes[str(f)] = f.stat().st_mtime
                except OSError:
                    pass
        return mtimes

    def _check_changes(self) -> None:
        """Compare current mtime snapshot against the stored one."""
        if not self._running:
            return
        current = self._snapshot_mtimes()
        changed: list[str] = []

        for path, mtime in current.items():
            old_mtime = self._file_mtimes.get(path)
            if old_mtime is None:
                continue
            if mtime > old_mtime:
                changed.append(path)

        for path in self._file_mtimes:
            if path not in current:
                changed.append(path)

        self._file_mtimes = current

        if changed:
            with self._lock:
                self._pending_files.update(changed)
            self._debounced_fire()

    def _debounced_fire(self) -> None:
        """Reset the debounce timer."""
        if self._timer:
            self._timer.cancel()
        self._timer = threading.Timer(self.debounce_seconds, self._fire)
        self._timer.daemon = True
        self._timer.start()

    def _fire(self) -> None:
        """Fire the on_change callback with accumulated changed files."""
        with self._lock:
            files = list(self._pending_files)
            self._pending_files.clear()
        if files:
            try:
                self.on_change(files)
            except Exception as e:
                print(f"[FileWatcher] Error in on_change callback: {e}")

    def start(self) -> None:
        """Start watching for changes."""
        if self._running:
            return
        self._running = True
        self._file_mtimes = self._snapshot_mtimes()
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stop watching for changes."""
        self._running = False
        if self._timer:
            self._timer.cancel()
        if self._thread:
            self._thread.join(timeout=5)

    def _poll_loop(self) -> None:
        """Poll for changes every second."""
        while self._running:
            time.sleep(1.0)
            self._check_changes()

    def get_status(self) -> dict:
        """Return watcher status."""
        return {
            "running": self._running,
            "projectRoot": str(self.project_root),
            "watchedFiles": len(self._file_mtimes),
        }
