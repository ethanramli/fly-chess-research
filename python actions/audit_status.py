"""Compactly monitor one already-running FlyChess audit on Windows.

Raw stdout/stderr stay in their existing files. In watch mode this prints only
the initial state, new progress milestones, and the terminal state.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path


def process_snapshot(pid: int) -> dict:
    ps = (
        f"$targetPid={pid}; "
        "$p=Get-CimInstance Win32_Process -Filter \"ProcessId=$targetPid\" -EA SilentlyContinue; "
        "if(!$p){[pscustomobject]@{state='absent'}|ConvertTo-Json -Compress; exit}; "
        "$g=Get-Process -Id $targetPid -EA SilentlyContinue; "
        "$free=(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024; "
        "[pscustomobject]@{state='live';command=$p.CommandLine;cpu=[math]::Round($g.CPU,1);"
        "workingSetMiB=[math]::Round($g.WorkingSet64/1MB,1);freeMiB=[math]::Round($free,1)} "
        "|ConvertTo-Json -Compress"
    )
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", ps],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def latest_progress(path: Path) -> dict | None:
    latest = None
    if not path.exists():
        return None
    with path.open(encoding="utf-8", errors="replace") as stream:
        for line in stream:
            if '"auditProgress"' not in line:
                continue
            try:
                latest = json.loads(line)
            except json.JSONDecodeError:
                continue
    return latest


def report(args: argparse.Namespace) -> tuple[dict, bool]:
    snapshot = process_snapshot(args.pid)
    progress = latest_progress(args.stdout)
    stderr_bytes = args.stderr.stat().st_size if args.stderr.exists() else 0
    published = args.audit.exists()
    if snapshot["state"] == "live" and args.expected_command not in snapshot.get("command", ""):
        snapshot["state"] = "identity_mismatch"
    data = {
        **snapshot,
        "progress": progress,
        "stderrBytes": stderr_bytes,
        "auditPublished": published,
    }
    terminal = snapshot["state"] != "live" or published
    return data, terminal


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pid", required=True, type=int)
    parser.add_argument("--stdout", required=True, type=Path)
    parser.add_argument("--stderr", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument(
        "--expected-command", default="audit-g0-reversal-history-diagnostic.mjs"
    )
    parser.add_argument("--watch", action="store_true")
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--heartbeat", type=int, default=300)
    args = parser.parse_args()
    if args.interval < 1 or args.heartbeat < 1:
        parser.error("--interval and --heartbeat must be positive")

    last_marker = None
    last_heartbeat = 0.0
    while True:
        data, terminal = report(args)
        progress = data.get("progress") or {}
        marker = (progress.get("receipts"), progress.get("frames"), progress.get("lessons"))
        now = time.monotonic()
        emit = (
            not args.watch
            or terminal
            or marker != last_marker
            or now - last_heartbeat >= args.heartbeat
        )
        if emit:
            print(json.dumps(data, separators=(",", ":")), flush=True)
            last_marker = marker
            last_heartbeat = now
        if terminal or not args.watch:
            return 0
        # Keep periodic output small while still proving the process is alive.
        time.sleep(args.interval)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as error:
        print(json.dumps({"actionError": str(error)}, separators=(",", ":")), file=sys.stderr)
        raise SystemExit(2)
