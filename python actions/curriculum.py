"""Repeatable, compact CLI around registered FlyChess commands (stdlib only)."""
from __future__ import annotations

import argparse
import base64
import ctypes
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from uuid import uuid4

import fly_controls

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = Path(__file__).with_name("curriculum-step.json")
DEFAULT_CURRICULUM = Path(__file__).with_name("curriculum-campaign.json")
LIMIT = 16 * 1024 * 1024
GRAPH_COMMAND = re.compile(r"(?:--cpu-duty\b|\.codebase[/\\]scripts[/\\]|research[/\\]reports.*[/\\](?:run[^/\\]*|benchmark|audit[^/\\]*)\.mjs)", re.I)


def emit(value):
    print(json.dumps(value, ensure_ascii=True, separators=(",", ":")), flush=True)


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def read_json(path):
    path = Path(path)
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rb") as stream:
        data = stream.read(LIMIT + 1)
    if len(data) > LIMIT:
        raise ValueError(f"JSON exceeds {LIMIT} bytes: {path}")
    return json.loads(data.decode("utf-8-sig"))


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def local(path):
    resolved = (ROOT / path).resolve()
    if not resolved.is_relative_to(ROOT.resolve()):
        raise ValueError(f"Workspace path escapes repository: {path}")
    return resolved


def load_config(path):
    config = read_json(path)
    if config.get("schema") != 1 or not isinstance(config.get("paused"), bool):
        raise ValueError("Expected schema=1 and an explicit paused boolean")
    config["_path"] = str(Path(path).resolve())
    config["_hash"] = digest(path)
    return config


def expand(config, value):
    return value.format_map(config["paths"])


def process_command(pid):
    """Read an owned Windows command line; unreadable processes stay unknown."""
    if os.name != "nt" or not isinstance(pid, int) or pid <= 0:
        return None
    class UNICODE_STRING(ctypes.Structure):
        _fields_ = [("Length", ctypes.c_ushort), ("MaximumLength", ctypes.c_ushort),
                    ("Buffer", ctypes.c_void_p)]
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.argtypes = (ctypes.c_ulong, ctypes.c_bool, ctypes.c_ulong)
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.CloseHandle.argtypes = (ctypes.c_void_p,)
    query = ctypes.WinDLL("ntdll").NtQueryInformationProcess
    query.argtypes = (ctypes.c_void_p, ctypes.c_ulong, ctypes.c_void_p,
                      ctypes.c_ulong, ctypes.POINTER(ctypes.c_ulong))
    query.restype = ctypes.c_long
    handle = kernel.OpenProcess(0x1000, False, pid)  # QUERY_LIMITED_INFORMATION
    if not handle:
        return None
    try:
        needed = ctypes.c_ulong()
        query(handle, 60, None, 0, ctypes.byref(needed))  # ProcessCommandLineInformation
        if not ctypes.sizeof(UNICODE_STRING) <= needed.value <= 1024 * 1024:
            return None
        buffer = ctypes.create_string_buffer(needed.value)
        if query(handle, 60, buffer, len(buffer), ctypes.byref(needed)) != 0:
            return None
        value = UNICODE_STRING.from_buffer(buffer)
        start = ctypes.addressof(buffer)
        if (not value.Buffer or value.Length % 2 or value.Length > value.MaximumLength
                or value.Buffer < start + ctypes.sizeof(UNICODE_STRING)
                or value.Buffer + value.Length > start + len(buffer)):
            return None
        return ctypes.wstring_at(value.Buffer, value.Length // 2) or None
    finally:
        kernel.CloseHandle(handle)


def inventory():
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]

    memory = MEMORYSTATUSEX()
    memory.dwLength = ctypes.sizeof(memory)
    if not ctypes.WinDLL("kernel32", use_last_error=True).GlobalMemoryStatusEx(ctypes.byref(memory)):
        raise ctypes.WinError(ctypes.get_last_error())
    free_mib = round(memory.ullAvailPhys / 2**20, 1)

    # WMI is denied in some managed environments. Get-Process exposes the
    # owned process instance, start time and image while preserving unknowns.
    script = """
    $ErrorActionPreference='Stop'
    $rows=@(Get-Process -Name node,python -ErrorAction SilentlyContinue | ForEach-Object {
      $g=$_;$created=$null;$image=$null;$cpu=$null;$working=$null
      try {$created=$g.StartTime.ToUniversalTime().ToString('o')} catch {}
      try {$image=$g.Path} catch {}
      try {$cpu=[math]::Round($g.CPU,1)} catch {}
      try {$working=[math]::Round($g.WorkingSet64/1MB,1)} catch {}
      [pscustomobject]@{pid=$g.Id;created=$created;imagePath=$image;cpuSeconds=$cpu;
        workingSetMiB=$working;name=($g.ProcessName+'.exe')}
    })
    [pscustomobject]@{processes=$rows}|ConvertTo-Json -Depth 4 -Compress
    """
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        capture_output=True, text=True, timeout=20,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode:
        raise RuntimeError("Process inspection failed; state unknown: " + result.stderr[-1000:])
    observed = json.loads(result.stdout)
    for row in observed["processes"]:
        row["command"] = process_command(row["pid"])
    return {"freeMiB": free_mib, **observed}


def tail(path, size=4096):
    path = Path(path)
    if not path.exists():
        return ""
    with path.open("rb") as stream:
        stream.seek(max(0, path.stat().st_size - size))
        return stream.read(size).decode("utf-8-sig", errors="replace")


def progress(path):
    # Bounded tail: never read receipt streams, memories, or full training logs.
    for line in reversed(tail(path, 65536).splitlines()):
        try:
            row = json.loads(line)
        except (ValueError, TypeError):
            continue
        if isinstance(row, dict):
            fields = ("auditProgress", "receipts", "totalReceipts", "receiptCount", "frames", "lessons", "stage", "lesson", "sequence", "replica", "condition", "phase", "checkpoint", "resume", "status", "diagnosticComplete", "G0Passed", "event", "completedLineages", "totalLineages", "lineageKey", "lineages")
            selected = {k: row[k] for k in fields if k in row and isinstance(row[k], (str, int, float, bool, type(None)))}
            if selected:
                return selected
    return None


def artifact(path, fields):
    path = Path(path)
    if not path.exists():
        return {"path": str(path), "state": "missing"}
    try:
        data = read_json(path)
        selected = {key: data[key] for key in fields if key in data}
        if isinstance(selected.get("invocation"), dict):
            selected["invocation"] = {k: selected["invocation"][k] for k in ("presentations", "peakRssMiB", "elapsedSeconds", "cpu", "resumedFrom") if k in selected["invocation"]}
        # Never print neural memories or potentially huge receipt/context arrays.
        for key in list(selected):
            if len(json.dumps(selected[key])) > 6000:
                selected[key] = "omitted: inspect this named field separately"
        return {"path": str(path), "state": "published", "sha256": digest(path), "summary": selected}
    except (ValueError, OSError) as error:
        return {"path": str(path), "state": "invalid", "error": str(error)[:500]}


def reports(config):
    fields = config.get("report_fields", ["passed", "fullNeuralReplay", "G0Passed", "diagnosticComplete", "receiptCount", "receipts", "branchResults", "gates", "scope", "peakRssMiB", "elapsedSeconds"])
    return {name: artifact(local(expand(config, path)), fields)
            for name, path in config["artifacts"].items()}


def checkpoint(path):
    path = Path(path)
    if ".partial" in path.name or path.name.endswith(".tmp"):
        raise ValueError("Partial files are not checkpoint publications")
    if path.suffix == ".checkpoint":
        result = subprocess.run(
            ["node", "--max-old-space-size=256", str(ROOT / ".codebase/scripts/runtime/inspect-checkpoint.mjs"), str(path)],
            capture_output=True, text=True, timeout=20,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if result.returncode:
            raise ValueError("Invalid native checkpoint: " + result.stderr[-500:])
        return json.loads(result.stdout)
    data = read_json(path)
    return {"path": str(path), "sha256": digest(path),
            "protocolHash": data.get("identity", {}).get("protocolHash"),
            **{k: data.get(k) for k in ("sequence", "receiptCount", "stage", "lesson", "logBytes", "chainHash")},
            "pendingReceipt": data.get("pendingReceipt") is not None,
            "scope": "Parsed publication only; runner and independent recovery audit must verify continuity"}


def latest_checkpoint(directory):
    candidates = ((int(match.group(1)), Path(entry.path)) for entry in os.scandir(directory)
                  if entry.is_file() and (match := re.fullmatch(r"checkpoint-(\d+)\.(?:json(?:\.gz)?|checkpoint)", entry.name)))
    return max(candidates, default=(0, None))[1]


def _matrix_recovery_file(config, run_path):
    recovery = config.get("recovery", {})
    if recovery.get("kind") != "lichess-stage-matrix-v1":
        return None
    name = recovery.get("stateFile", "matrix-state.json")
    if (not isinstance(name, str) or not name or Path(name).is_absolute()
            or ".." in Path(name).parts or Path(name).name != name):
        raise ValueError("Matrix recovery stateFile must be a repository-local filename")
    return Path(run_path) / name


def _matrix_resume_readiness(state_path, source_run):
    if not state_path.is_file():
        return False, "matrix recovery state is missing"
    try:
        state = read_json(state_path)
    except (OSError, ValueError) as error:
        return False, "matrix recovery state is invalid: " + str(error)[:250]
    if (state.get("schema") != "lichess-curriculum-matrix-state-v1"
            or state.get("status") != "running"
            or not isinstance(state.get("completed"), dict)
            or not isinstance(state.get("plans"), dict)):
        return False, "matrix recovery state is not a resumable running publication"
    active = state.get("active")
    if active is not None:
        if not isinstance(active, dict) or not isinstance(active.get("attempt"), str):
            return False, "matrix active-lineage identity is incomplete"
        attempt = Path(active["attempt"]).resolve()
        source = Path(source_run).resolve()
        if not attempt.is_relative_to(source) or not attempt.is_dir():
            return False, "matrix active attempt is missing or outside its source run"
        checkpoint = _latest_matrix_checkpoint(attempt)
        if checkpoint is None:
            return False, "matrix active lineage has no complete stage checkpoint; refusing a fresh restart"
    return True, None


def _latest_matrix_checkpoint(directory):
    direct = sorted(Path(directory).glob("stage-checkpoint-[0-9][0-9][0-9].json.gz"))
    if direct:
        return direct[-1]
    attempts = sorted(path for path in Path(directory).glob("attempt-[0-9][0-9][0-9]") if path.is_dir())
    for attempt in reversed(attempts):
        candidates = sorted(attempt.glob("stage-checkpoint-[0-9][0-9][0-9].json.gz"))
        if candidates:
            return candidates[-1]
    return None


def verify(config):
    return [{"path": expand(config, path), "expected": expected,
             "actual": digest(local(expand(config, path))) if local(expand(config, path)).is_file() else None}
            for path, expected in config.get("pins", {}).items()]


def resolve_command(config, job):
    argv = [expand(config, arg) for arg in job["argv"]]
    if not argv or any(not isinstance(arg, str) for arg in argv):
        raise ValueError("Command must be a nonempty argument array")
    executable = shutil.which(argv[0])
    if not executable:
        raise ValueError(f"Executable unavailable: {argv[0]}")
    if Path(executable).name.lower() in ("npm", "npm.cmd"):
        cli = Path(executable).parent / "node_modules/npm/bin/npm-cli.js"
        if not cli.is_file():
            raise ValueError("Cannot resolve npm-cli.js; configure its explicit Node command")
        return [shutil.which("node"), str(cli), *argv[1:]]
    if Path(executable).suffix.lower() in (".cmd", ".bat"):
        raise ValueError("Configure the underlying executable rather than a shell batch wrapper")
    return [executable, *argv[1:]]


def plan(config, name, live=None):
    job = config["jobs"][name]
    argv = resolve_command(config, job)
    pins = verify(config)
    blockers = ["pin mismatch: " + row["path"] for row in pins if row["actual"] != row["expected"]]
    for path in job.get("requires", []):
        if not local(expand(config, path)).is_file():
            blockers.append("missing input: " + expand(config, path))
    for path in job.get("refuse_existing", []):
        if local(expand(config, path)).exists():
            blockers.append("preserve existing artifact: " + expand(config, path))
    if job.get("fresh_output") and local(expand(config, job["fresh_output"])).exists():
        blockers.append("output must be a new directory")
    if job["role"] != "check":
        if job["role"] in ("train", "resume") and expand(config, job.get("fresh_output", "")) != config["paths"]["run"]:
            blockers.append("fresh_output must match paths.run; never report parent artifacts as new-run evidence")
        if config["paused"]:
            blockers.append("research paused; configuration is not authorization to resume")
        # CPU duty 0.75 allowed for new registrations (researcher instruction 2026-10-29).
        if "--max-old-space-size=256" not in argv or argv[-2:] not in (["--cpu-duty", "0.5"], ["--cpu-duty", "0.75"]):
            blockers.append("required heap/duty flags missing or changed")
        if config.get("recovery", {}).get("kind") == "lichess-stage-matrix-v1":
            matrix_limits = config.get("resourceLimits", {})
            if (not isinstance(matrix_limits, dict) or matrix_limits.get("rssMiB") != 2048
                    or matrix_limits.get("freeMiB") != 256):
                blockers.append("stage matrix Python guards must match the registered 2048 MiB RSS and 256 MiB free-memory limits")
            try:
                protocol_flag = argv.index("--protocol")
                if Path(argv[protocol_flag + 1]).resolve() != local(config["paths"]["protocol"]).resolve():
                    blockers.append("stage matrix must publish the exact registered protocol in its run directory")
            except (ValueError, IndexError):
                blockers.append("stage matrix job must pass --protocol {protocol}")
        live = inventory() if live is None else live
        if live["freeMiB"] < 256:
            blockers.append("less than 256 MiB free memory")
        # Serial by default. A step may declare parallel.maxGraphProcesses (at most 4 graph processes in all,
        # researcher instruction 2026-10-29); unknown node processes count as graph processes.
        pacing = config.get("power_pacing")
        if pacing is not None and (not isinstance(pacing, dict) or pacing.get("battery") not in (0.25, 0.5)
                                   or str(pacing.get("ac")) != argv[-1] or pacing["battery"] >= pacing["ac"]):
            blockers.append("power_pacing must be {ac: the registered --cpu-duty, battery: 0.25 or 0.5 below it}")
        max_graph = config.get("parallel", {}).get("maxGraphProcesses", 1)
        if not isinstance(max_graph, int) or not 1 <= max_graph <= 4:
            blockers.append("parallel.maxGraphProcesses must be an integer from 1 to 4")
            max_graph = 1
        graph_rows = [row for row in live["processes"] if row["name"].lower() == "node.exe"
                      and (not row.get("command") or GRAPH_COMMAND.search(row["command"]))]
        if len(graph_rows) >= max_graph:
            blockers.extend(f"live or unknown experiment process: PID{row['pid']}" for row in graph_rows)
        protocol = local(config["paths"]["protocol"])
        if not any(local(expand(config, key)) == protocol for key in config.get("pins", {})):
            blockers.append("protocol needs an explicit SHA256 pin")
        if job["role"] == "resume":
            recovery = config.get("recovery", {})
            if recovery.get("kind") == "lichess-stage-matrix-v1":
                resume_state = config.get("paths", {}).get("resume_state")
                if not isinstance(resume_state, str) or not resume_state:
                    blockers.append("matrix resume-state path is not configured")
                else:
                    state_path = local(resume_state)
                    ready, reason = _matrix_resume_readiness(state_path, state_path.parent)
                    if not ready:
                        blockers.append(reason)
                    argv = resolve_command(config, job)
                    try:
                        flag = argv.index("--resume-state")
                        if Path(argv[flag + 1]).resolve() != state_path.resolve():
                            blockers.append("resume job does not pass the registered matrix state")
                    except (ValueError, IndexError):
                        blockers.append("resume job must pass --resume-state {resume_state}")
            else:
                saved = checkpoint(local(config["paths"]["checkpoint"]))
                if saved["protocolHash"] != digest(protocol):
                    blockers.append("checkpoint protocol mismatch")
        if job["role"] == "audit":
            run = local(config["paths"]["run"])
            if (run / "protocol.json").is_file() and digest(run / "protocol.json") != digest(protocol):
                blockers.append("run protocol mismatch")
    return {"job": name, "role": job["role"], "argv": argv, "cwd": str(ROOT),
            "ready": not blockers, "blockers": blockers, "pins": pins}


def state_path(config):
    return local(config.get("state_file", "runs/python-actions/current.json"))


def matching_process(handle, live):
    row = next((p for p in live["processes"] if p["pid"] == handle["pid"]), None)
    if not row:
        return "missing", None
    if not row.get("created") or not handle.get("created"):
        return "unknown", row
    if row.get("command") is not None:
        if row["created"] != handle["created"] or row["command"] != handle.get("command"):
            return "identity_mismatch", row
        return "live", row
    if not row.get("imagePath") or row.get("workingSetMiB") is None:
        return "unknown", row
    try:
        observed_start = datetime.fromisoformat(row["created"].replace("Z", "+00:00"))
        recorded_start = datetime.fromisoformat(handle["created"].replace("Z", "+00:00"))
        same_instance = abs((observed_start - recorded_start).total_seconds()) <= 0.001
        recorded_argv = handle.get("argv") or windows_argv(handle.get("command", ""))
        expected_image = str(Path(recorded_argv[0]).resolve()).casefold()
        observed_image = str(Path(row["imagePath"]).resolve()).casefold()
    except (ValueError, IndexError, OSError):
        return "unknown", row
    if not same_instance or observed_image != expected_image:
        return "identity_mismatch", row
    return "live", row


def windows_argv(command):
    count = ctypes.c_int()
    parser = ctypes.windll.shell32.CommandLineToArgvW
    parser.argtypes = (ctypes.c_wchar_p, ctypes.POINTER(ctypes.c_int))
    parser.restype = ctypes.POINTER(ctypes.c_wchar_p)
    pointer = parser(command, ctypes.byref(count))
    if not pointer:
        raise OSError("Cannot parse observed Windows command line")
    try:
        return [pointer[i] for i in range(count.value)]
    finally:
        free = ctypes.windll.kernel32.LocalFree
        free.argtypes = (ctypes.c_void_p,)
        free.restype = ctypes.c_void_p
        free(pointer)


def status(config):
    live = inventory()
    limits = config.get("resourceLimits", {})
    if not isinstance(limits, dict):
        raise ValueError("resourceLimits must be an object")
    rss_limit = limits.get("rssMiB", 768)
    free_limit = limits.get("freeMiB", 256)
    if (not isinstance(rss_limit, int) or not 1 <= rss_limit <= 2048
            or not isinstance(free_limit, int) or free_limit < 256):
        raise ValueError("Registered resource limits must use RSS 1-2048 MiB and at least 256 MiB free")
    path = state_path(config)
    if not path.exists():
        observed_pid = config.get("observe", {}).get("pid")
        observed = next((p for p in live["processes"] if p["pid"] == observed_pid), None)
        return {"state": "untracked", "paused": config["paused"], "next": "attach an existing process or start a registered job",
                "observedPid": observed_pid, "observedProcessState": "unverified_candidate" if observed else "missing",
                "experimentPids": [p["pid"] for p in live["processes"] if GRAPH_COMMAND.search(p.get("command") or "")],
                "unverifiedNodePids": [p["pid"] for p in live["processes"]
                                       if p["name"].lower() == "node.exe" and not p.get("command")]}
    handle = read_json(path)
    state, row = matching_process(handle, live)
    output = {"state": state, "paused": config["paused"], "job": handle["job"], "pid": handle["pid"],
              "configChanged": handle["configHash"] != config["_hash"], "freeMiB": live["freeMiB"],
              "resourceLimits": {"rssMiB": rss_limit, "freeMiB": free_limit},
              "progress": progress(handle["stdout"]), "stderrBytes": Path(handle["stderr"]).stat().st_size,
              "logs": {"stdout": handle["stdout"], "stderr": handle["stderr"]},
              "exitCode": handle.get("exitCode"),
              "artifacts": {key: Path(value).exists() for key, value in handle["artifacts"].items()}}
    if row and state == "live":
        output.update({key: row[key] for key in ("cpuSeconds", "workingSetMiB")})
        output["resourceGuardExceeded"] = row["workingSetMiB"] > rss_limit or live["freeMiB"] < free_limit
    if handle.get("role") in ("train", "resume") and Path(handle["run"]).is_dir():
        candidate = latest_checkpoint(handle["run"])
        output["checkpoint"] = checkpoint(candidate) if candidate else None
    return output


def curriculum_status(registration_path):
    """Report the campaign state without consulting the legacy one-step config."""
    registration_path = Path(registration_path).resolve()
    if not registration_path.is_relative_to(ROOT.resolve()):
        raise ValueError("Curriculum registration must be inside the repository")
    if not registration_path.is_file():
        return {"state": "not_registered", "registration": str(registration_path),
                "acceptedStages": 0, "totalStages": 12,
                "reason": "The full curriculum campaign registration is missing; no experiment can start."}
    registration = read_json(registration_path)
    registration_hash = digest(registration_path)
    stages = registration.get("stages")
    if registration.get("schema") != 1 or not isinstance(stages, list) or \
            [row.get("stage") for row in stages] != list(range(1, 13)):
        return {"state": "registration_invalid", "registration": str(registration_path),
                "acceptedStages": 0, "totalStages": 12,
                "reason": "Campaign registration must pin ordered stages 1 through 12."}
    campaign_id = hashlib.sha256(str(registration_path).encode()).hexdigest()[:16]
    state_path = local(f"runs/python-actions/curriculum-campaign-{campaign_id}.json")
    base = {"registration": str(registration_path), "registrationSha256": registration_hash,
            "acceptedStages": 0, "totalStages": 12, "stateFile": str(state_path)}
    if not state_path.is_file():
        return {"state": "ready_to_start" if registration.get("paused") is False else "paused",
                **base, "stage": 1, "reason": "No campaign stage has been started."}
    state = read_json(state_path)
    if state.get("schema") != 1 or state.get("registrationSha256") != registration_hash:
        return {"state": "registration_changed", **base,
                "reason": "Saved campaign identity differs; preserve it and register a new campaign."}
    records = state.get("stages")
    if not isinstance(records, list) or not all(isinstance(row, dict) for row in records):
        return {"state": "state_invalid", **base, "reason": "Saved campaign stage history is invalid."}
    if (not isinstance(state.get("stage"), int) or isinstance(state.get("stage"), bool)
            or not 1 <= state["stage"] <= 12
            or state.get("terminal") not in (None, "gate-failed", "unknown", "readiness-blocked", "complete")):
        return {"state": "state_invalid", **base, "reason": "Saved campaign stage or terminal state is invalid."}
    accepted = sum(1 for row in records if row.get("status") == "accepted")
    current_stage = state.get("stage")
    terminal = state.get("terminal")
    current = next((row for row in records if row.get("stage") == current_stage), None)
    stage_execution = None
    if current and current.get("status") in ("running", "interrupted"):
        entry = stages[current_stage - 1] if isinstance(current_stage, int) and 1 <= current_stage <= 12 else None
        config_path = local(entry["config"]) if entry and isinstance(entry.get("config"), str) else None
        if config_path and config_path.is_file():
            try:
                stage_config = load_config(config_path)
                stage_execution = status(stage_config)
            except (OSError, ValueError, KeyError, TypeError) as error:
                stage_execution = {"state": "unknown", "reason": str(error)[:250]}
        else:
            stage_execution = {"state": "unknown", "reason": "Current stage config is missing."}
    if terminal:
        campaign_state = terminal.replace("-", "_")
    elif current and current.get("status") == "running":
        campaign_state = "stage_running" if stage_execution and stage_execution.get("state") == "live" else "stage_recovery_required"
    elif current and current.get("status") == "interrupted":
        campaign_state = "stage_recovery_required"
    else:
        campaign_state = "ready_to_start"
    return {"state": campaign_state, **base, "acceptedStages": accepted, "stage": current_stage,
            "currentStageStatus": current.get("status") if current else None,
            "stageExecution": stage_execution,
            "terminal": terminal}


def attach(config, name, pid):
    observed = config["observe"]
    if name != observed["job"]:
        raise ValueError("Observation configuration belongs to a different job")
    expected = [expand(config, item).replace("\\", "/").lower() for item in observed["expected"]]
    row = next((p for p in inventory()["processes"] if p["pid"] == pid), None)
    tokens = [part.replace("\\", "/").lower() for part in windows_argv(row["command"])] if row and row.get("command") else []
    planned = [part.replace("\\", "/").lower() for part in resolve_command(config, config["jobs"][name])]
    if not row or not all(item in tokens for item in expected) or tokens != planned:
        raise ValueError("Cannot attach: process absent, inspection unknown, or command identity differs")
    handle = {"job": name, "role": config["jobs"][name]["role"], "run": str(local(config["paths"]["run"])),
              "pid": pid, "created": row["created"], "command": row["command"],
              "configHash": config["_hash"], "exitCode": None,
              "artifacts": {k: str(local(expand(config, v))) for k, v in config["artifacts"].items()},
              **{key: str(local(expand(config, observed[key]))) for key in ("stdout", "stderr")}}
    if not all(Path(handle[key]).is_file() for key in ("stdout", "stderr")):
        raise ValueError("Configured observation logs are missing")
    atomic_json(state_path(config), handle)
    return {"attached": name, "pid": pid, "scope": "observation only; no process started or resumed"}


def execute(config, name, foreground=False, on_started=None):
    state = state_path(config)
    state.parent.mkdir(parents=True, exist_ok=True)
    lock = state.with_suffix(".launch-lock")
    # ponytail: one short launch lock matches the repository's serial graph rule.
    with lock.open("x"):
        pass
    try:
        prepared = plan(config, name)
        if not prepared["ready"]:
            raise ValueError("; ".join(prepared["blockers"]))
        if foreground != (prepared["role"] == "check"):
            raise ValueError("Use run for checks; use start for train/resume/audit")
        invocation = state.parent / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid4().hex[:8])
        invocation.mkdir()
        config_bytes = Path(config["_path"]).read_bytes()
        if hashlib.sha256(config_bytes).hexdigest() != config["_hash"]:
            raise ValueError("Configuration changed during launch")
        (invocation / "config.json").write_bytes(config_bytes)
        atomic_json(invocation / "intent.json", {**prepared, "configHash": config["_hash"], "actionSha256": digest(__file__)})
        stdout, stderr = invocation / "stdout.txt", invocation / "stderr.txt"
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        if not foreground:
            flags |= getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        with stdout.open("wb") as out, stderr.open("wb") as err:
            process = subprocess.Popen(prepared["argv"], cwd=ROOT, stdout=out, stderr=err, stdin=subprocess.DEVNULL, creationflags=flags)
        handle = {"job": name, "role": prepared["role"], "run": str(local(config["paths"]["run"])),
                  "pid": process.pid, "configHash": config["_hash"],
                  "stdout": str(stdout), "stderr": str(stderr), "argv": prepared["argv"], "exitCode": None,
                  "artifacts": {k: str(local(expand(config, v))) for k, v in config["artifacts"].items()},
                  "created": None, "command": None}
        # Persist PID/log paths before another inspection can fail. Never auto-relaunch.
        atomic_json(invocation / "handle.json", handle)
        if not foreground:
            atomic_json(state, handle)
        row = next((p for p in inventory()["processes"] if p["pid"] == process.pid), None) if not foreground or on_started else None
        if row:
            handle.update(created=row["created"], command=row.get("command"), imagePath=row.get("imagePath"))
        atomic_json(invocation / "handle.json", handle)
        if not foreground:
            atomic_json(state, handle)
        if on_started is not None:
            on_started(handle)
    finally:
        lock.unlink(missing_ok=True)
    if foreground:
        handle["exitCode"] = process.wait()
        atomic_json(invocation / "completion.json", handle)
        counts = dict(re.findall(r"^# (tests|pass|fail|duration_ms) (\S+)", tail(stdout, 65536), re.M))
        summary = None
        try:
            summary = json.loads(tail(stdout, 8192).splitlines()[-1])
            summary = {k: summary[k] for k in ("tests", "passed", "failed", "errors", "skipped", "scope") if k in summary} if isinstance(summary, dict) else None
        except (ValueError, IndexError):
            pass
        return {"job": name, "exitCode": handle["exitCode"], "testCounts": counts,
                "checkSummary": summary,
                "logs": {"stdout": str(stdout), "stderr": str(stderr)},
                "errorTail": tail(stderr, 1200) if handle["exitCode"] else None}
    return {"started": name, "pid": process.pid, "stateFile": str(state), "logs": {"stdout": str(stdout), "stderr": str(stderr)}}


def watch(config, seconds, interval):
    if not 0 < seconds <= 60 or not 1 <= interval <= 60:
        raise ValueError("Watch windows must be 1-60 seconds; intervals 1-60 seconds")
    deadline, previous = time.monotonic() + seconds, None
    while True:
        sample = status(config)
        fingerprint = {key: sample.get(key) for key in ("state", "progress", "checkpoint", "stderrBytes", "artifacts", "resourceGuardExceeded")}
        if fingerprint != previous:
            emit(sample)
            previous = fingerprint
        if sample["state"] != "live" or sample.get("resourceGuardExceeded"):
            return
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            emit({"observationWindowEnded": True, "processState": "live", "scope": "timeout is not termination; nothing restarted"})
            return
        time.sleep(min(interval, remaining))


def inspect_status(config, attempts=5, delay=30):
    """Retry transient inspection; an unknown sample is not evidence that the job stopped."""
    for attempt in range(1, attempts + 1):
        try:
            sample = status(config)
        except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
            sample, problem = None, error
        else:
            if sample.get("state") in ("live", "missing"):
                return sample
            problem = sample.get("state")
        if attempt == attempts:
            if sample is not None:
                return sample
            raise problem
        emit({"warning": "status inspection retry", "attempt": attempt, "problem": str(problem)[:300]})
        time.sleep(delay)


def resource_guard_response(config, sample, pausable=True):
    """Confirm a breach with two re-samples before requesting a cooperative pause; False stops for review.

    Only train-mode runners honor pause-request.json, so a non-pausable (audit) breach stops for review.
    """
    run = local(config["paths"]["run"])
    if pausable and (run / "pause-request.json").exists():
        return True
    for _ in range(2):
        time.sleep(20)
        try:
            resample = inspect_status(config)
        except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
            resample = {"error": str(error)[:300]}
        if not resample.get("resourceGuardExceeded"):
            emit({"warning": "transient resource guard breach", "status": resample})
            return True
    try:
        argv = read_json(state_path(config)).get("argv", [])
    except (OSError, ValueError, AttributeError):
        argv = None  # unreadable or malformed handle: the running process cannot be verified
    supported = config.get("pause_control", {}).get("supported_executables", [])
    if not pausable or argv is None or not any(path in argv or str(local(path)) in argv for path in supported):
        emit({"checkpoint": "paused_for_review", "reason": "resource guard exceeded; process left untouched", "status": sample})
        return False
    atomic_json(run / "pause-request.json", {
        "schema": 1, "run": str(run), "protocolHash": digest(run / "protocol.json"),
        "requestedAt": datetime.now(timezone.utc).isoformat(),
    })
    emit({"checkpoint": "resource_guard_pause_requested", "status": resample})
    return True


def _publish_lock(lock, record):
    """Publish a complete lock exclusively; False if one exists. A temporary file is linked in, so no reader sees a partial lock."""
    lock.parent.mkdir(parents=True, exist_ok=True)
    temporary = lock.with_name(lock.name + "." + uuid4().hex + ".tmp")
    try:
        with temporary.open("wb") as stream:
            stream.write((json.dumps(record, indent=2) + "\n").encode("utf-8"))
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, lock)
        return True
    except FileExistsError:
        return False
    finally:
        temporary.unlink(missing_ok=True)


def _claim_lock(lock, record, live):
    """Returns None when claimed, else the reason nothing may launch."""
    if _publish_lock(lock, record):
        return None
    try:
        raw = lock.read_bytes()
    except FileNotFoundError:
        raw = None  # released meanwhile; retry below
    if raw is not None:
        try:
            saved = json.loads(raw.decode("utf-8-sig"))
            owner = next((p for p in live["processes"] if p["pid"] == saved["pid"]), None)
            created = saved.get("created")
            if owner and (not owner.get("created") or not created or owner["created"] == created):
                return "another babysit is already supervising this step"
        except (ValueError, KeyError, TypeError, AttributeError):
            # A corrupt lock cannot identify a live owner; only exact-bytes removal below is allowed.
            emit({"warning": "babysit lock is corrupt; treating as stale", "lock": str(lock)})
        try:
            if lock.read_bytes() == raw:  # never remove a lock that another claimant just replaced
                lock.unlink()
        except FileNotFoundError:
            pass
    return None if _publish_lock(lock, record) else "babysit lock contended; nothing launched"


def _release_lock(lock, token):
    try:
        if read_json(lock).get("token") == token:
            lock.unlink()
    except (OSError, ValueError, AttributeError):
        pass


def supervise(config, train_name, audit_name, interval, terminal_result_statuses=(), required_result_status=None):
    """One babysit per registered step: exclusive lock ownership, released only by its own token."""
    config_id, _ = fly_controls.campaign_location(config, sys.modules[__name__])
    lock = local(f"runs/python-actions/babysit-{config_id}.lock")
    token = uuid4().hex
    try:
        live = inventory()
        me = next((p for p in live["processes"] if p["pid"] == os.getpid()), None)
        claim = _claim_lock(lock, {"pid": os.getpid(), "created": me.get("created") if me else None, "token": token}, live)
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
        emit({"checkpoint": "paused_for_review", "reason": "babysit lock could not be verified; nothing launched", "error": str(error)[:500]})
        return 2
    if claim is not None:
        emit({"checkpoint": "paused_for_review", "reason": claim, "lock": str(lock)})
        return 2
    try:
        return _supervise(config, train_name, audit_name, interval, terminal_result_statuses, required_result_status)
    finally:
        _release_lock(lock, token)


def _supervise(config, train_name, audit_name, interval, terminal_result_statuses=(), required_result_status=None):
    """Run or resume one registered learner job through audit, then stop for review."""
    if interval < 10 or interval > 3600:
        raise ValueError("Supervisor interval must be 10-3600 seconds")
    if config["jobs"][train_name]["role"] not in ("train", "resume"):
        raise ValueError("Training job must have role train or resume")
    # audit_name None: train-only supervision for one parallel replica; it stops at result.json.
    if audit_name is not None and config["jobs"][audit_name]["role"] != "audit":
        raise ValueError("Audit job must have role audit")

    base_run = local(config["paths"]["run"])
    config_id, campaign_file = fly_controls.campaign_location(config, sys.modules[__name__])
    protocol = local(config["paths"]["protocol"])
    protocol_hash = digest(protocol)
    if campaign_file.exists():
        campaign = read_json(campaign_file)
        if (campaign.get("schema") != 1 or campaign.get("configHash") != config["_hash"]
                or campaign.get("protocolHash") != protocol_hash or campaign.get("baseRun") != str(base_run)
                or campaign.get("trainJob") != train_name or campaign.get("auditJob") != audit_name):
            emit({"checkpoint": "paused_for_review", "reason": "babysit registration changed; existing recovery lineage preserved"})
            return 2
        source_run = local(campaign["currentRun"])
        resume_count = campaign.get("resumeCount", 0)
        if not isinstance(resume_count, int) or resume_count < 0:
            raise ValueError("Invalid babysit resume count")
        if not source_run.is_dir():
            emit({"checkpoint": "paused_for_review", "reason": "tracked run directory is missing; refusing a fresh restart", "run": str(source_run)})
            return 2
    else:
        source_run, resume_count = base_run, 0

    # A tracked job still running for this lineage is adopted, never duplicated.
    adopted = None
    if campaign_file.exists() and state_path(config).exists():
        try:
            handle = read_json(state_path(config))
            state, _ = matching_process(handle, inventory())
            job = handle.get("job")
            if state != "missing":
                runnable = (state == "live" and local(handle["run"]) == source_run and handle.get("role") in ("train", "resume", "audit")
                            and (job in (train_name, audit_name) or config["jobs"].get(job, {}).get("role") == "resume"))
                adopted_config = load_config(Path(handle["stdout"]).parent / "config.json") if runnable else None
                strip = lambda c: {k: v for k, v in c.items() if k not in ("paths", "_path", "_hash")}
                if not runnable or local(adopted_config["paths"]["run"]) != source_run or strip(adopted_config) != strip(config):
                    emit({"checkpoint": "paused_for_review", "reason": "tracked job is still running or unverifiable; refusing to start another", "status": {"state": state, "job": job}})
                    return 2
                emit({"checkpoint": "adopted_live_job", "job": job, "pid": handle["pid"], "run": handle["run"]})
                adopted = (handle["role"], job, adopted_config)
        except (OSError, RuntimeError, ValueError, KeyError, subprocess.SubprocessError) as error:
            emit({"checkpoint": "paused_for_review", "reason": "tracked job could not be verified; refusing to start another", "error": str(error)[:500]})
            return 2
    adopted_audit = adopted is not None and adopted[0] == "audit"

    previous_pause_hash =digest(source_run / 'pause-request.json') if (source_run / 'pause-request.json').exists() else None

    matrix_mode = config.get("recovery", {}).get("kind") == "lichess-stage-matrix-v1"
    matrix_state_path = None

    def runtime_config(run_path, checkpoint_path, label, resume_state_path=None):
        payload = {key: value for key, value in config.items() if key not in ("_path", "_hash")}
        payload["paths"] = dict(payload["paths"])
        payload["paths"]["run"] = str(run_path)
        if checkpoint_path is not None:
            payload["paths"]["checkpoint"] = str(checkpoint_path)
        if matrix_mode:
            payload["paths"]["resume_state"] = str(resume_state_path or "")
        config_dir = local("runs/python-actions/babysit-configs")
        config_dir.mkdir(parents=True, exist_ok=True)
        suffix = hashlib.sha256(str(run_path).encode()).hexdigest()[:10]
        saved = config_dir / f"{config_id}-{label}-{suffix}.json"
        atomic_json(saved, payload)
        return load_config(saved)

    if adopted is not None:
        pass  # the tracked job already owns this run; no new run, preflight or launch
    elif source_run.is_dir():
        source_protocol = source_run / "protocol.json"
        if not source_protocol.is_file() or digest(source_protocol) != protocol_hash:
            emit({"checkpoint": "paused_for_review", "reason": "run protocol does not match the registered protocol", "run": str(source_run)})
            return 2
        if (source_run / "audit.json").is_file():
            runtime = runtime_config(source_run, None, "complete")
            summary = reports(runtime)
            if summary["audit"].get("state") != "published":
                emit({"checkpoint": "paused_for_review", "reason": "existing audit publication is invalid", "artifacts": summary})
                return 2
            campaign = {"schema": 1, "configHash": config["_hash"], "protocolHash": protocol_hash,
                        "baseRun": str(base_run), "currentRun": str(source_run), "resumeCount": resume_count,
                        "trainJob": train_name, "auditJob": audit_name, "phase": "audited"}
            atomic_json(campaign_file, campaign)
            emit({"checkpoint": "audit_already_published", "artifacts": summary,
                  "scope": "no new training started; one registered run and audit only"})
            return 0
        if (source_run / "result.json").is_file():
            result = read_json(source_run / "result.json")
            if (result.get("status") in terminal_result_statuses
                    or (required_result_status is not None and result.get("status") != required_result_status)):
                campaign["phase"] = "terminal-result"
                atomic_json(campaign_file, campaign)
                emit({"checkpoint": "learner_terminal", "status": result.get("status", "unknown"),
                      "run": str(source_run), "scope": "training runner published a terminal result; independent audit was not started"})
                return 3
            if audit_name is None:
                emit({"checkpoint": "training_complete", "run": str(source_run), "status": result.get("status"),
                      "scope": "train-only supervision; merge and audit are separate registered steps"})
                return 0
            run_path, checkpoint_path, job_name, phase = source_run, None, audit_name, "audit"
        elif matrix_mode:
            matrix_state_path = _matrix_recovery_file(config, source_run)
            ready, reason = _matrix_resume_readiness(matrix_state_path, source_run)
            if not ready:
                emit({"checkpoint": "paused_for_review", "reason": reason,
                      "run": str(source_run), "matrixState": str(matrix_state_path)})
                return 2
            job_name = next((name for name, job in config["jobs"].items() if job.get("role") == "resume"), None)
            if job_name is None:
                emit({"checkpoint": "paused_for_review", "reason": "no registered matrix resume job; refusing to restart from scratch",
                      "run": str(source_run)})
                return 2
            resume_count += 1
            run_path = base_run.with_name(f"{base_run.name}-resume-{resume_count:04d}")
            while run_path.exists():
                resume_count += 1
                run_path = base_run.with_name(f"{base_run.name}-resume-{resume_count:04d}")
            checkpoint_path, phase = None, "resume"
        else:
            selected = latest_checkpoint(source_run)
            if selected is None:
                emit({"checkpoint": "paused_for_review", "reason": "no complete checkpoint in interrupted run; refusing to restart from scratch", "run": str(source_run)})
                return 2
            selected_summary = checkpoint(selected)
            if selected_summary.get("protocolHash") != protocol_hash:
                emit({"checkpoint": "paused_for_review", "reason": "checkpoint protocol mismatch", "checkpoint": str(selected)})
                return 2
            job_name = next((name for name, job in config["jobs"].items() if job.get("role") == "resume"), None)
            if job_name is None:
                emit({"checkpoint": "paused_for_review", "reason": "no registered resume job; refusing to restart from scratch"})
                return 2
            resume_count += 1
            run_path = base_run.with_name(f"{base_run.name}-resume-{resume_count:04d}")
            while run_path.exists():
                resume_count += 1
                run_path = base_run.with_name(f"{base_run.name}-resume-{resume_count:04d}")
            checkpoint_path, phase = selected, "resume"
    else:
        if campaign_file.exists():
            emit({"checkpoint": "paused_for_review", "reason": "registered attempt has no output directory; refusing an implicit restart"})
            return 2
        run_path, checkpoint_path, job_name, phase = base_run, None, train_name, "train"

    if adopted is None:
        runtime = runtime_config(run_path, checkpoint_path, phase,
                                 matrix_state_path if phase == "resume" and matrix_mode else None)
        prepared = plan(runtime, job_name)
        if not prepared["ready"]:
            emit({"checkpoint": "paused_for_review", "reason": "registered job preflight blocked", "blockers": prepared["blockers"]})
            return 2
        campaign = {"schema": 1, "configHash": config["_hash"], "protocolHash": protocol_hash,
                    "baseRun": str(base_run), "currentRun": str(run_path), "sourceRun": str(source_run),
                    "checkpoint": str(checkpoint_path) if checkpoint_path else None, "resumeCount": resume_count,
                    **({"matrixResumeState": str(matrix_state_path)} if phase == "resume" and matrix_mode else {}),
                    "trainJob": train_name, "auditJob": audit_name, "phase": phase}
        atomic_json(campaign_file, campaign)
        if phase == "audit" and previous_pause_hash is not None:
            fly_controls.archive_pause_request(run_path, sys.modules[__name__], previous_pause_hash)
        if phase in ("train", "resume"):
            started = execute(runtime, job_name)
            emit({"checkpoint": "resume_started" if phase == "resume" else "training_started",
                  "fromCheckpoint": str(checkpoint_path) if checkpoint_path else None, **started})
    else:
        phase, job_name, runtime = adopted
        run_path = source_run
    train_config = runtime
    train_run = str(run_path)
    if phase not in ("train", "resume"):
        audit_config = runtime

    previous = None
    while phase in ("train", "resume"):
        while True:
            if digest(config["_path"]) != config["_hash"] or digest(train_config["_path"]) != train_config["_hash"]:
                emit({"checkpoint": "paused_for_review", "reason": "configuration file changed during training"})
                return 2
            try:
                sample = inspect_status(train_config)
            except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
                emit({"checkpoint": "paused_for_review", "reason": "process status inspection failed; run left untouched", "error": str(error)[:500]})
                return 2
            if sample.get("configChanged") or sample.get("job") != job_name:
                emit({"checkpoint": "paused_for_review", "reason": "tracked training identity changed", "status": sample})
                return 2
            if sample["state"] == "live":
                if sample.get("resourceGuardExceeded") and not resource_guard_response(train_config, sample, pausable=True):
                    return 2
                fingerprint = {key: sample.get(key) for key in ("progress", "checkpoint", "stderrBytes", "artifacts", "workingSetMiB")}
                if fingerprint != previous:
                    emit({"phase": "training", **sample})
                    previous = fingerprint
                wait_for_supervised_update(train_config, interval)
                continue
            if sample["state"] != "missing":
                emit({"checkpoint": "paused_for_review", "reason": "training process identity is not conclusive", "status": sample})
                return 2
            break
        if not (Path(train_run) / "result.json").is_file():
            if fly_controls.pause_receipt(Path(train_run), sys.modules[__name__]):
                campaign["phase"] = "paused"
                atomic_json(campaign_file, campaign)
                print('PAUSED - progress saved. Resume with fly babysit.', flush=True)
                return 0
            # A runner error is usually deterministic; show it rather than inviting a blind retry.
            error_tail = tail(sample.get("logs", {}).get("stderr", ""), 800) if sample.get("stderrBytes") else ""
            emit({"checkpoint": "interrupted", "reason": "no result published; the next babysit invocation will validate and resume from the latest complete checkpoint", "run": train_run,
                  **({"errorTail": error_tail} if error_tail else {}), "status": sample})
            return 2
        result = read_json(Path(train_run) / "result.json")
        if (result.get("status") in terminal_result_statuses
                or (required_result_status is not None and result.get("status") != required_result_status)):
            campaign["phase"] = "terminal-result"
            atomic_json(campaign_file, campaign)
            emit({"checkpoint": "learner_terminal", "status": result.get("status", "unknown"),
                  "run": train_run, "scope": "training runner published a terminal result; independent audit was not started"})
            return 3
        handle = read_json(state_path(train_config))
        if handle.get("job") != job_name or handle.get("run") != train_run:
            emit({"checkpoint": "paused_for_review", "reason": "tracked training identity changed", "run": train_run})
            return 2
        campaign["phase"] = "result_ready"
        atomic_json(campaign_file, campaign)
        if audit_name is None:
            emit({"checkpoint": "training_complete", "run": train_run, "status": result.get("status"),
                  "scope": "train-only supervision; merge and audit are separate registered steps"})
            return 0
        if fly_controls.pause_between_jobs(Path(train_run), sys.modules[__name__]):
            campaign["phase"] = "paused"
            atomic_json(campaign_file, campaign)
            print('PAUSED - training saved. Resume verification with fly babysit.', flush=True)
            return 0
        phase = "audit"
        audit_config = train_config

    if digest(config["_path"]) != config["_hash"] or digest(audit_config["_path"]) != audit_config["_hash"]:
        emit({"checkpoint": "paused_for_review", "reason": "configuration file changed before audit"})
        return 2
    if not adopted_audit:  # a live adopted audit would fail preflight against itself
        audit_plan = plan(audit_config, audit_name)
        if not audit_plan["ready"]:
            emit({"checkpoint": "paused_for_review", "reason": "audit preflight blocked", "blockers": audit_plan["blockers"]})
            return 2
    if phase != "audit":
        raise ValueError("Unexpected babysit phase")
    if not adopted_audit and not (Path(audit_config["paths"]["run"]) / "audit.json").is_file():
        campaign["phase"] = "auditing"
        atomic_json(campaign_file, campaign)
        audited = execute(audit_config, audit_name)
        emit({"checkpoint": "audit_started", **audited})

    previous = None
    while True:
        if digest(config["_path"]) != config["_hash"] or digest(audit_config["_path"]) != audit_config["_hash"]:
            emit({"checkpoint": "paused_for_review", "reason": "configuration file changed during audit"})
            return 2
        try:
            sample = inspect_status(audit_config)
        except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
            emit({"checkpoint": "paused_for_review", "reason": "process status inspection failed; audit left untouched", "error": str(error)[:500]})
            return 2
        if sample.get("configChanged") or sample.get("job") != audit_name:
            emit({"checkpoint": "paused_for_review", "reason": "tracked audit identity changed", "status": sample})
            return 2
        audit_path = Path(audit_config["paths"]["run"]) / "audit.json"
        if audit_path.is_file():
            summary = reports(audit_config)
            if summary["audit"].get("state") != "published":
                emit({"checkpoint": "paused_for_review", "reason": "audit publication is invalid", "artifacts": summary})
                return 2
            campaign["phase"] = "audited"
            atomic_json(campaign_file, campaign)
            emit({"checkpoint": "audit_published", "artifacts": summary,
                  "scope": "one registered experiment and independent audit; stopped for scientific review"})
            return 0
        if sample["state"] == "live":
            if sample.get("resourceGuardExceeded") and not resource_guard_response(audit_config, sample, pausable=False):
                return 2
            fingerprint = {key: sample.get(key) for key in ("progress", "stderrBytes", "artifacts", "workingSetMiB")}
            if fingerprint != previous:
                emit({"phase": "audit", **sample})
                previous = fingerprint
            wait_for_supervised_update(audit_config, interval)
            continue
        if sample["state"] == "missing" and fly_controls.pause_receipt(Path(audit_config["paths"]["run"]), sys.modules[__name__]):
            campaign["phase"] = "paused"
            atomic_json(campaign_file, campaign)
            print('PAUSED - training saved; verification can restart with fly babysit.', flush=True)
            return 0
        emit({"checkpoint": "interrupted", "reason": "audit stopped without publication; the next invocation may retry the read-only audit after process reconciliation", "status": sample})
        return 2


def _campaign_value(document, path):
    value = document
    for part in path.split("."):
        if isinstance(value, dict) and part in value:
            value = value[part]
        else:
            return None
    return value


def _campaign_diagnosis(document):
    keys = ("diagnosis", "reason", "failureReason", "scope", "limitations", "nextAction")
    result = {}
    for key in keys:
        value = document.get(key) if isinstance(document, dict) else None
        if isinstance(value, str):
            result[key] = value[:500]
        elif isinstance(value, list):
            result[key] = [item[:300] for item in value[:8] if isinstance(item, str)]
        elif isinstance(value, dict):
            result[key] = json.dumps(value, ensure_ascii=True, sort_keys=True)[:1000]
    return result


def _campaign_memory_state(result, audit, expected_initial):
    """Check either one legacy learner or every named arm/replica lineage."""
    fields = ("initialMemoryHashes", "finalMemoryHashes")
    if any(field in result or field in audit for field in fields):
        initial, final = result.get(fields[0]), result.get(fields[1])
        audited_initial, audited_final = audit.get(fields[0]), audit.get(fields[1])
        valid = all(isinstance(value, dict) and value for value in
                    (initial, final, audited_initial, audited_final))
        if valid:
            valid = (set(initial) == set(final) == set(audited_initial) == set(audited_final)
                     and all(isinstance(key, str) and re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", key)
                             for key in initial)
                     and all(re.fullmatch(r"[a-f0-9]{64}", str(value or ""))
                             for manifest in (initial, final, audited_initial, audited_final)
                             for value in manifest.values()))
        unknown = not valid
        promotion = audit.get("promotionMemoryHashes")
        promotion_valid = (isinstance(promotion, dict) and bool(promotion)
                           and set(promotion) == set(initial or {})
                           and all(re.fullmatch(r"[a-f0-9]{64}", str(value or ""))
                                   for value in promotion.values()))
        accepted_without_promotion = audit.get("stageAccepted") is True and not promotion_valid
        mismatch = (unknown or initial != audited_initial or final != audited_final
                    or (expected_initial is not None and initial != expected_initial)
                    or accepted_without_promotion)
        return {"initial": initial, "final": promotion if promotion_valid and audit.get("stageAccepted") is True else audited_final,
                "trainingFinal": final, "promotion": promotion if promotion_valid else None,
                "unknown": unknown or accepted_without_promotion, "mismatch": mismatch}

    initial, final = result.get("initialMemorySha256"), result.get("finalMemorySha256")
    audited_initial, audited_final = audit.get("initialMemorySha256"), audit.get("finalMemorySha256")
    valid = all(re.fullmatch(r"[a-f0-9]{64}", str(value or "")) for value in
                (initial, final, audited_initial, audited_final))
    unknown = not valid
    mismatch = (unknown or initial != audited_initial or final != audited_final
                or (expected_initial is not None and initial != expected_initial))
    return {"initial": initial, "final": final, "unknown": unknown, "mismatch": mismatch}


def detached_command(babysit_args, log_path, config=None):
    """cmd.exe line that runs `fly [--config CONFIG] babysit ARGS` and appends all output to log_path.
    The step config is forwarded (2026-10-30, ledger L093); before, a per-replica detach lost it."""
    prefix = [] if config is None else ["--config", str(config)]
    if any(not isinstance(arg, str) or '"' in arg or '\n' in arg for arg in [*prefix, *babysit_args]):
        raise ValueError("Detached babysit arguments must be plain strings without quotes")
    return 'cmd.exe /d /s /c ""{}" {}babysit {} >> "{}" 2>&1"'.format(
        ROOT / "fly.cmd", subprocess.list2cmdline(prefix) + " " if prefix else "",
        subprocess.list2cmdline(babysit_args), log_path)


def process_in_any_job(pid):
    """True/False when Windows reports job membership of pid; None when unknown."""
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.OpenProcess.argtypes = (ctypes.c_ulong, ctypes.c_bool, ctypes.c_ulong)
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.IsProcessInJob.argtypes = (ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_int))
    kernel.CloseHandle.argtypes = (ctypes.c_void_p,)
    handle = kernel.OpenProcess(0x1000, False, pid)  # QUERY_LIMITED_INFORMATION
    if not handle:
        return None
    try:
        result = ctypes.c_int()
        return bool(result.value) if kernel.IsProcessInJob(handle, None, ctypes.byref(result)) else None
    finally:
        kernel.CloseHandle(handle)


def launch_detached(command_line):
    """Start command_line outside this session. CREATE_BREAKAWAY_FROM_JOB takes it
    out of the session's job object (an agent session runs in one, and closing it
    kills its members); a new process group and its own hidden console
    (CREATE_NO_WINDOW) cut it from this terminal, so it keeps running after the
    launching agent or terminal exits. Windows raises OSError if the job forbids
    breakaway; nothing is started then. (Tried first and abandoned, see the
    fix-goal ledger: Win32_Process.Create via WMI lost 3 of 5 test processes;
    DETACHED_PROCESS left no console, and the venv python.exe launcher then
    dropped redirected output.)"""
    flags = (getattr(subprocess, "CREATE_BREAKAWAY_FROM_JOB", 0x01000000)
             | getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)
             | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200))
    process = subprocess.Popen(command_line, cwd=ROOT, creationflags=flags, stdin=subprocess.DEVNULL,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True)
    return process.pid


def detach_babysit(babysit_args, config=None):
    """Start `fly [--config CONFIG] babysit ARGS` detached with a log; record and return its handle."""
    directory = local("runs/python-actions/detached")
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid4().hex[:8]
    log = directory / f"babysit-{stamp}.log"
    command = detached_command(babysit_args, log, config)
    pid = launch_detached(command)
    handle = {"schema": 1, "pid": pid, "babysitArgs": babysit_args, "commandLine": command, "log": str(log),
              "startedAt": datetime.now(timezone.utc).isoformat(), "inAnyJob": process_in_any_job(pid),
              "scope": "detached launcher process (cmd.exe); it runs fly babysit, which owns the registered jobs"}
    atomic_json(directory / f"babysit-{stamp}.json", handle)
    return handle


def campaign_state_location(registration_path):
    registration_path = Path(registration_path).resolve()
    campaign_id = hashlib.sha256(str(registration_path).encode()).hexdigest()[:16]
    return local(f"runs/python-actions/curriculum-campaign-{campaign_id}.json")


def campaign_stage_config(registration_path):
    """Step config of the stage a campaign babysit is running, for `fly pause`; None if none."""
    state_path = campaign_state_location(registration_path)
    if not Path(registration_path).is_file() or not state_path.exists():
        return None
    state = read_json(state_path)
    if state.get("terminal") is not None:
        return None
    entry = next((row for row in read_json(registration_path).get("stages", [])
                  if row.get("stage") == state.get("stage")), None)
    if not entry or not isinstance(entry.get("config"), str):
        return None
    return load_config(local(entry["config"]))


def supervise_curriculum(registration_path, interval):
    """Run twelve registered stage cycles serially and stop on the first unpassed gate."""
    registration_path = Path(registration_path).resolve()
    if not registration_path.is_relative_to(ROOT.resolve()):
        raise ValueError("Curriculum registration must be inside the repository")
    registration = read_json(registration_path)
    registration_hash = digest(registration_path)
    stages = registration.get("stages")
    if registration.get("schema") != 1 or registration.get("paused") is not False:
        raise ValueError("Curriculum registration must use schema=1 and paused=false")
    if not isinstance(stages, list) or [s.get("stage") for s in stages] != list(range(1, 13)):
        raise ValueError("Curriculum registration must list stages 1 through 12 in order")
    if interval < 10 or interval > 3600:
        raise ValueError("Supervisor interval must be 10-3600 seconds")

    state_path = campaign_state_location(registration_path)
    if state_path.exists():
        state = read_json(state_path)
        if state.get("schema") != 1 or state.get("registrationSha256") != registration_hash:
            emit({"checkpoint": "readiness_blocked", "reason": "campaign registration changed; preserve the existing campaign and register a new identity", "state": str(state_path)})
            return 2
        if state.get("terminal") in ("gate-failed", "unknown", "readiness-blocked", "complete"):
            emit({"checkpoint": state["terminal"], "reason": "campaign is terminal; a reviewed new registration is required to continue", "stage": state.get("stage"), "state": str(state_path)})
            return 2 if state["terminal"] != "complete" else 0
    else:
        state = {"schema": 1, "registrationSha256": registration_hash,
                 "registration": str(registration_path), "stage": 1,
                 "terminal": None, "stages": []}
        atomic_json(state_path, state)

    previous_stage = None
    for entry in stages:
        stage = entry["stage"]
        if stage < state["stage"]:
            saved = next((row for row in state["stages"] if row.get("stage") == stage), None)
            if not saved or saved.get("status") != "accepted":
                emit({"checkpoint": "readiness_blocked", "reason": "campaign history lacks an accepted earlier stage", "stage": stage})
                return 2
            previous_stage = saved
            continue
        if not isinstance(entry.get("config"), str) or not re.fullmatch(r"[a-f0-9]{64}", str(entry.get("configSha256", ""))):
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            reason = entry.get("readinessBlockedReason")
            emit({"checkpoint": "readiness_blocked", "stage": stage,
                  "reason": reason[:500] if isinstance(reason, str) and reason
                  else "stage config and its SHA256 pin are required"})
            return 2
        stage_config_path = local(entry["config"])
        if not stage_config_path.is_file() or digest(stage_config_path) != entry["configSha256"]:
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "stage config missing or its registered SHA256 does not match", "config": str(stage_config_path)})
            return 2
        required = entry.get("requiredAuditTrue")
        if not isinstance(required, list) or not required or any(not isinstance(path, str) or not path.startswith("audit.") for path in required):
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "explicit independent-audit boolean gates are required"})
            return 2
        if not {"audit.fullNeuralReplay", "audit.stageAccepted", "audit.memoryContinuityVerified"}.issubset(required):
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage,
                  "reason": "replay integrity, scientific acceptance and memory continuity must be explicit promotion gates"})
            return 2
        initial_memory_hashes = entry.get("initialMemoryHashes")
        initial_memory_valid = (isinstance(initial_memory_hashes, dict) and bool(initial_memory_hashes)
                                and all(isinstance(key, str) and re.fullmatch(r"[A-Za-z0-9._:-]{1,128}", key)
                                        for key in initial_memory_hashes)
                                and all(re.fullmatch(r"[a-f0-9]{64}", str(value or ""))
                                        for value in initial_memory_hashes.values()))
        single_initial_memory_valid = re.fullmatch(r"[a-f0-9]{64}", str(entry.get("initialMemorySha256", "")))
        if stage == 1 and not (initial_memory_valid or single_initial_memory_valid):
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage,
                  "reason": "stage 1 must pin the from-scratch initial memory identity for every learner lineage"})
            return 2
        if stage > 1 and (previous_stage is None or entry.get("requiresAcceptedStage") != stage - 1):
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "stage must explicitly require the immediately preceding accepted stage"})
            return 2
        if stage == 1 and entry.get("requiresAcceptedStage") is not None:
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "stage 1 cannot declare a preceding curriculum stage"})
            return 2
        prerequisites = entry.get("prerequisites")
        if not isinstance(prerequisites, list) or not prerequisites:
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "pinned prerequisite evidence is required before training"})
            return 2
        for prerequisite in prerequisites:
            if (not isinstance(prerequisite, dict) or not isinstance(prerequisite.get("path"), str)
                    or not re.fullmatch(r"[a-f0-9]{64}", str(prerequisite.get("sha256", "")))
                    or not isinstance(prerequisite.get("requiredTrue"), list)
                    or not prerequisite["requiredTrue"]):
                state.update({"stage": stage, "terminal": "readiness-blocked"})
                atomic_json(state_path, state)
                emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "malformed prerequisite evidence registration"})
                return 2
            evidence_path = local(prerequisite["path"])
            if not evidence_path.is_file() or digest(evidence_path) != prerequisite["sha256"]:
                state.update({"stage": stage, "terminal": "readiness-blocked"})
                atomic_json(state_path, state)
                emit({"checkpoint": "readiness_blocked", "stage": stage,
                      "reason": "prerequisite evidence missing or changed", "path": str(evidence_path)})
                return 2
            evidence = read_json(evidence_path)
            absent = [path for path in prerequisite["requiredTrue"]
                      if not isinstance(path, str) or _campaign_value(evidence, path) is not True]
            if absent:
                state.update({"stage": stage, "terminal": "readiness-blocked"})
                atomic_json(state_path, state)
                emit({"checkpoint": "readiness_blocked", "stage": stage,
                      "reason": "prerequisite evidence does not satisfy its frozen gates",
                      "path": str(evidence_path), "unsatisfied": absent})
                return 2

        stage_config = load_config(stage_config_path)
        train_name, audit_name = entry.get("trainJob"), entry.get("auditJob")
        if train_name not in stage_config.get("jobs", {}) or audit_name not in stage_config.get("jobs", {}):
            state.update({"stage": stage, "terminal": "readiness-blocked"})
            atomic_json(state_path, state)
            emit({"checkpoint": "readiness_blocked", "stage": stage, "reason": "registered train/audit job missing from stage config"})
            return 2
        if state["stages"] and state["stages"][-1].get("stage") == stage:
            stage_record = state["stages"][-1]
        else:
            stage_record = {"stage": stage, "status": "running", "configSha256": entry["configSha256"],
                            "startedAt": datetime.now(timezone.utc).isoformat()}
            state["stages"].append(stage_record)
        state.update({"stage": stage, "terminal": None})
        stage_record.update({"status": "running", "configSha256": entry["configSha256"]})
        atomic_json(state_path, state)

        code = supervise(stage_config, train_name, audit_name, interval,
                         terminal_result_statuses=("readiness-blocked", "gate-failed", "unknown"),
                         required_result_status="training-complete")
        if code == 3:
            run_path = fly_controls.current_run(stage_config, sys.modules[__name__])
            result_path = run_path / "result.json"
            result = read_json(result_path) if result_path.is_file() else {}
            terminal = result.get("status")
            if terminal not in ("readiness-blocked", "gate-failed", "unknown"):
                terminal = "unknown"
            stage_record.update({"status": terminal, "run": str(run_path),
                                 "resultSha256": digest(result_path) if result_path.is_file() else None})
            state.update({"stage": stage, "terminal": terminal})
            atomic_json(state_path, state)
            emit({"checkpoint": terminal.replace("-", "_"), "stage": stage,
                  "reason": result.get("reason", "learner published a terminal stage result"),
                  "run": str(run_path), "state": str(state_path)})
            return 2
        if code != 0:
            stage_record.update({"status": "interrupted", "supervisorExitCode": code})
            state["terminal"] = None
            atomic_json(state_path, state)
            emit({"checkpoint": "stage_interrupted", "stage": stage, "reason": "registered stage cycle did not finish; rerun the same campaign to reconcile it", "supervisorExitCode": code})
            return code

        run_path = fly_controls.current_run(stage_config, sys.modules[__name__])
        audit_path, result_path = run_path / "audit.json", run_path / "result.json"
        # A cooperative pause (`fly pause`) ends the stage cycle with code 0 but no
        # audit; it is resumable, never a terminal stage outcome.
        if not audit_path.is_file() and fly_controls.pause_receipt(run_path, sys.modules[__name__]):
            stage_record.update({"status": "paused", "run": str(run_path)})
            state.update({"stage": stage, "terminal": None})
            atomic_json(state_path, state)
            emit({"checkpoint": "paused", "stage": stage, "run": str(run_path),
                  "reason": "paused with progress saved; rerun the same campaign babysit to resume"})
            return 0
        if not audit_path.is_file() or not result_path.is_file():
            stage_record.update({"status": "unknown", "run": str(run_path),
                                 "missingArtifacts": [str(path) for path in (result_path, audit_path) if not path.is_file()]})
            state.update({"terminal": "unknown"})
            atomic_json(state_path, state)
            emit({"checkpoint": "unknown", "stage": stage, "reason": "audit or learner result is missing",
                  "run": str(run_path), "missingArtifacts": stage_record["missingArtifacts"]})
            return 2
        audit = read_json(audit_path)
        result = read_json(result_path)
        expected_initial = ((entry.get("initialMemoryHashes") if "initialMemoryHashes" in entry
                             else entry.get("initialMemorySha256")) if stage == 1 else
                            (previous_stage.get("finalMemoryHashes") if "finalMemoryHashes" in previous_stage
                             else previous_stage.get("finalMemorySha256")))
        memory = _campaign_memory_state(result, audit, expected_initial)
        memory_unknown, memory_mismatch = memory["unknown"], memory["mismatch"]
        values = {path: _campaign_value({"audit": audit}, path) for path in required}
        missing = [path for path, value in values.items() if value is None]
        failed = [path for path, value in values.items() if value is not None and value is not True]
        if missing or failed or memory_mismatch:
            outcome = "unknown" if missing or memory_unknown else "gate-failed"
            diagnosis = {"audit": _campaign_diagnosis(audit), "learner": _campaign_diagnosis(result)}
            stage_record.update({"status": outcome, "run": str(run_path),
                                 "auditSha256": digest(audit_path), "resultSha256": digest(result_path),
                                 "missingGates": missing, "failedGates": failed,
                                 "memoryContinuityMismatch": memory_mismatch,
                                 "diagnosis": diagnosis,
                                 "artifacts": {"result": str(result_path), "audit": str(audit_path)}})
            state.update({"terminal": outcome})
            atomic_json(state_path, state)
            emit({"checkpoint": outcome, "stage": stage, "run": str(run_path),
                  "missingGates": missing, "failedGates": failed, "memoryContinuityMismatch": memory_mismatch,
                  "diagnosis": diagnosis, "artifacts": {"result": str(result_path), "audit": str(audit_path)},
                  "reason": "independent audit did not pass every predeclared stage gate; raw evidence remains in the run directory"})
            return 2
        stage_record.update({"status": "accepted", "run": str(run_path),
                             "auditSha256": digest(audit_path), "resultSha256": digest(result_path),
                             **({"finalMemoryHashes": memory["final"]} if isinstance(memory["final"], dict)
                                else {"finalMemorySha256": memory["final"]}),
                             **({"trainingFinalMemoryHashes": memory["trainingFinal"]}
                                if isinstance(memory.get("trainingFinal"), dict) else {}),
                             "acceptedAt": datetime.now(timezone.utc).isoformat()})
        state["stage"] = stage + 1
        previous_stage = stage_record
        atomic_json(state_path, state)
        emit({"checkpoint": "stage_accepted", "stage": stage, "auditSha256": stage_record["auditSha256"],
              "scope": "registered audit booleans only; no claim beyond the declared stage gate"})

    state.update({"stage": 12, "terminal": "complete", "completedAt": datetime.now(timezone.utc).isoformat()})
    atomic_json(state_path, state)
    emit({"checkpoint": "all_stages_complete", "acceptedStages": 12, "state": str(state_path),
          "scope": "all twelve registered stage gates passed; transferable reasoning still requires separate composition evaluation"})
    return 0


class SYSTEM_POWER_STATUS(ctypes.Structure):
    _fields_ = [("ACLineStatus", ctypes.c_ubyte), ("BatteryFlag", ctypes.c_ubyte), ("BatteryLifePercent", ctypes.c_ubyte),
                ("SystemStatusFlag", ctypes.c_ubyte), ("BatteryLifeTime", ctypes.c_ulong), ("BatteryFullLifeTime", ctypes.c_ulong)]


def on_ac_power():
    """True on mains, False on battery, None when unknown."""
    if os.name != "nt":
        return None
    status = SYSTEM_POWER_STATUS()
    if not ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
        return None
    return {0: False, 1: True}.get(status.ACLineStatus)


def update_power_pacing(config, run):
    """Battery-aware pacing (researcher request 2026-10-29): publish the registered duty for the charger state."""
    pacing = config.get("power_pacing")
    if not pacing or not run.is_dir():
        return
    ac = on_ac_power()
    duty = pacing["battery"] if ac is False else pacing["ac"]
    path = run / "power-pacing.json"
    try:
        current = read_json(path) if path.exists() else None
    except (OSError, ValueError):
        current = None
    if not current or current.get("duty") != duty:
        atomic_json(path, {"schema": 1, "duty": duty, "onAC": ac, "updatedAt": datetime.now(timezone.utc).isoformat()})
        emit({"checkpoint": "power_pacing", "duty": duty, "onAC": ac, "run": str(run)})


def wait_for_supervised_update(config, interval):
    run = local(config['paths']['run'])
    deadline = time.monotonic() + interval
    next_power = 0
    while time.monotonic() < deadline:
        if time.monotonic() >= next_power:
            update_power_pacing(config, run)
            next_power = time.monotonic() + 30
        if any((run / name).exists() for name in ('pause-request.json', 'paused.json', 'paused-audit.json')):
            time.sleep(1)
            return
        time.sleep(min(1, max(0, deadline - time.monotonic())))


def split_detach_argv(argv):
    """Split `[--config X] detach ARGS...` so babysit options pass through untouched."""
    index = 2 if argv[:1] == ["--config"] else 0
    if len(argv) > index and argv[index] == "detach":
        return argv[:index + 1], argv[index + 1:]
    return argv, None


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path)
    sub = parser.add_subparsers(dest="action", required=True)
    for action in ("plan", "start", "run"):
        sub.add_parser(action).add_argument("job")
    supervisor = sub.add_parser("babysit", help="run a registered experiment, or a pinned twelve-stage campaign")
    supervisor.add_argument("train_job", nargs="?")
    supervisor.add_argument("audit_job", nargs="?")
    supervisor.add_argument("--interval", type=int, default=300)
    supervisor.add_argument("--train-only", action="store_true",
                            help="supervise and resume training, then stop at result.json (one parallel replica)")
    supervisor.add_argument("--curriculum", type=Path, help="run the ordered, pinned twelve-stage campaign registration")
    att = sub.add_parser("attach")
    att.add_argument("job")
    att.add_argument("--pid", type=int)
    status_parser = sub.add_parser("status")
    status_parser.add_argument("--curriculum", type=Path,
                               help="report the pinned twelve-stage campaign state")
    sub.add_parser("detach", help="start `fly babysit ARGS` detached from this session, with a log")
    sub.add_parser("verify")
    sub.add_parser("pause").add_argument("--curriculum", type=Path,
                                         help="pause the stage that this campaign's babysit is running")
    sub.add_parser('report').add_argument('--json', action='store_true', help='raw artifact summaries for automation')
    cp = sub.add_parser("checkpoint")
    cp_paths = cp.add_mutually_exclusive_group()
    cp_paths.add_argument("--path")
    cp_paths.add_argument("--latest", action="store_true")
    log = sub.add_parser("logs")
    log.add_argument("--stream", choices=("stdout", "stderr"), default="stderr")
    log.add_argument("--bytes", type=int, default=1200)
    wait = sub.add_parser("watch")
    wait.add_argument("--seconds", type=int, default=60)
    wait.add_argument("--interval", type=int, default=30)
    argv, babysit_args = split_detach_argv(sys.argv[1:] if argv is None else argv)
    args = parser.parse_args(argv)
    config_explicit = args.config is not None
    config_path = args.config or DEFAULT_CONFIG
    if args.action == "babysit" and (args.curriculum is not None or
            (args.train_job is None and args.audit_job is None and not config_explicit)):
        campaign_path = args.curriculum or DEFAULT_CURRICULUM
        if not campaign_path.is_file():
            emit({"checkpoint": "readiness_blocked", "reason": "the full twelve-stage campaign registration is not available; no experiment was started", "registration": str(campaign_path)})
            return 2
        return supervise_curriculum(campaign_path, args.interval)
    if args.action == "detach":
        emit(detach_babysit(babysit_args, config_path if config_explicit else None))
        return 0
    config = load_config(config_path)
    if args.action in ("plan", "start", "run"):
        if args.job not in config["jobs"]:
            raise ValueError("Unknown job: " + args.job)
        result = plan(config, args.job) if args.action == "plan" else execute(config, args.job, args.action == "run")
        emit(result)
        return result.get("exitCode") or 0
    if args.action == "babysit":
        train_name, audit_name = args.train_job or "train", args.audit_job or "audit"
        if train_name not in config["jobs"] or (not args.train_only and audit_name not in config["jobs"]):
            raise ValueError("Unknown registered train or audit job")
        return supervise(config, train_name, None if args.train_only else audit_name, args.interval)
    if args.action == "attach":
        emit(attach(config, args.job, args.pid or config["observe"]["pid"]))
    elif args.action == "status":
        campaign_path = args.curriculum or (DEFAULT_CURRICULUM if not config_explicit else None)
        emit(curriculum_status(campaign_path) if campaign_path else status(config))
    elif args.action == "watch":
        watch(config, args.seconds, args.interval)
    elif args.action == "report":
        if args.json:
            resolved = {**config, 'paths': {**config['paths'], 'run': str(fly_controls.current_run(config, sys.modules[__name__]))}}
            emit({"artifacts": reports(resolved), "scope": "artifact summaries, not automatic scientific gate classification"})
        else:
            try:
                fly_controls.report(config, sys.modules[__name__])
            except (OSError, ValueError, RuntimeError) as error:
                print('Report unavailable: ' + str(error)[:250])
                return 2
    elif args.action == 'pause':
        try:
            # A campaign babysit runs a stage step file; pause that stage. Bare
            # `fly pause` does so for the default campaign when it is running.
            campaign_path = args.curriculum or (DEFAULT_CURRICULUM if not config_explicit else None)
            stage_config = campaign_stage_config(campaign_path) if campaign_path else None
            if args.curriculum is not None and stage_config is None:
                print('No running stage for this campaign. Saved progress is unchanged.')
                return 0
            return fly_controls.pause(stage_config or config, sys.modules[__name__])
        except (OSError, ValueError, RuntimeError) as error:
            print('Pause not confirmed: ' + str(error)[:250])
            return 2
    elif args.action == "verify":
        pins = verify(config)
        emit({"pins": pins, "matched": all(p["expected"] == p["actual"] for p in pins), "scope": "configured pins only; runner/auditor check their full identity contracts"})
        return int(any(p["expected"] != p["actual"] for p in pins))
    elif args.action == "checkpoint":
        path = latest_checkpoint(local(config["paths"]["run"])) if args.latest else local(args.path or config["paths"]["checkpoint"])
        if path is None:
            raise ValueError("No complete checkpoint filename found; no recovery point selected")
        emit(checkpoint(path))
    elif args.action == "logs":
        if not 1 <= args.bytes <= 8192:
            raise ValueError("Log reads are bounded to 1-8192 bytes")
        handle = read_json(state_path(config))
        emit({"stream": args.stream, "tail": tail(handle[args.stream], args.bytes)})
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, subprocess.SubprocessError, RuntimeError) as error:
        emit({"actionError": str(error)[:1500], "scope": "no automatic retry or restart"})
        raise SystemExit(2)
