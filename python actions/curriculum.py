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


def inventory():
    # Python captures PowerShell's full output; only selected data reach the agent.
    script = """
    $ErrorActionPreference='Stop'
    $free=(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1024
    $rows=@(Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='python.exe'" | ForEach-Object {
      $g=Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
      [pscustomobject]@{pid=$_.ProcessId;command=$_.CommandLine;created=$_.CreationDate.ToUniversalTime().ToString('o');
        cpuSeconds=[math]::Round($g.CPU,1);workingSetMiB=[math]::Round($g.WorkingSet64/1MB,1);name=$_.Name}
    })
    [pscustomobject]@{freeMiB=[math]::Round($free,1);processes=$rows}|ConvertTo-Json -Depth 4 -Compress
    """
    encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
    result = subprocess.run(
        ["powershell.exe", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        capture_output=True, text=True, timeout=20,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    if result.returncode:
        raise RuntimeError("Process inspection failed; state unknown: " + result.stderr[-1000:])
    return json.loads(result.stdout)


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
            fields = ("auditProgress", "receipts", "totalReceipts", "receiptCount", "frames", "lessons", "stage", "lesson", "sequence", "replica", "condition", "phase", "checkpoint", "resume", "status", "diagnosticComplete", "G0Passed")
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
        if "--max-old-space-size=256" not in argv or ["--cpu-duty", "0.5"] != argv[-2:]:
            blockers.append("required heap/duty flags missing or changed")
        live = inventory() if live is None else live
        if live["freeMiB"] < 256:
            blockers.append("less than 256 MiB free memory")
        for row in live["processes"]:
            if row["name"].lower() == "node.exe" and (not row.get("command") or GRAPH_COMMAND.search(row["command"])):
                blockers.append(f"live or unknown experiment process: PID{row['pid']}")
        protocol = local(config["paths"]["protocol"])
        if not any(local(expand(config, key)) == protocol for key in config.get("pins", {})):
            blockers.append("protocol needs an explicit SHA256 pin")
        if job["role"] == "resume":
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
    if not row.get("command") or not handle.get("created"):
        return "unknown", row
    if row["created"] != handle["created"] or row["command"] != handle["command"]:
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
    path = state_path(config)
    if not path.exists():
        observed_pid = config.get("observe", {}).get("pid")
        observed = next((p for p in live["processes"] if p["pid"] == observed_pid), None)
        return {"state": "untracked", "paused": config["paused"], "next": "attach an existing process or start a registered job",
                "observedPid": observed_pid, "observedProcessState": "unverified_candidate" if observed else "missing",
                "experimentPids": [p["pid"] for p in live["processes"] if GRAPH_COMMAND.search(p.get("command") or "")]}
    handle = read_json(path)
    state, row = matching_process(handle, live)
    output = {"state": state, "paused": config["paused"], "job": handle["job"], "pid": handle["pid"],
              "configChanged": handle["configHash"] != config["_hash"], "freeMiB": live["freeMiB"],
              "progress": progress(handle["stdout"]), "stderrBytes": Path(handle["stderr"]).stat().st_size,
              "logs": {"stdout": handle["stdout"], "stderr": handle["stderr"]},
              "exitCode": handle.get("exitCode"),
              "artifacts": {key: Path(value).exists() for key, value in handle["artifacts"].items()}}
    if row and state == "live":
        output.update({key: row[key] for key in ("cpuSeconds", "workingSetMiB")})
        output["resourceGuardExceeded"] = row["workingSetMiB"] > 768 or live["freeMiB"] < 256
    if handle.get("role") in ("train", "resume") and Path(handle["run"]).is_dir():
        candidate = latest_checkpoint(handle["run"])
        output["checkpoint"] = checkpoint(candidate) if candidate else None
    return output


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


def execute(config, name, foreground=False):
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
        row = next((p for p in inventory()["processes"] if p["pid"] == process.pid), None) if not foreground else None
        if row:
            handle.update(created=row["created"], command=row["command"])
        atomic_json(invocation / "handle.json", handle)
        if not foreground:
            atomic_json(state, handle)
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


def supervise(config, train_name, audit_name, interval):
    """Run or resume one registered learner job through audit, then stop for review."""
    if interval < 10 or interval > 3600:
        raise ValueError("Supervisor interval must be 10-3600 seconds")
    if config["jobs"][train_name]["role"] not in ("train", "resume"):
        raise ValueError("Training job must have role train or resume")
    if config["jobs"][audit_name]["role"] != "audit":
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

    previous_pause_hash = digest(source_run / 'pause-request.json') if (source_run / 'pause-request.json').exists() else None

    def runtime_config(run_path, checkpoint_path, label):
        payload = {key: value for key, value in config.items() if key not in ("_path", "_hash")}
        payload["paths"] = dict(payload["paths"])
        payload["paths"]["run"] = str(run_path)
        if checkpoint_path is not None:
            payload["paths"]["checkpoint"] = str(checkpoint_path)
        config_dir = local("runs/python-actions/babysit-configs")
        config_dir.mkdir(parents=True, exist_ok=True)
        suffix = hashlib.sha256(str(run_path).encode()).hexdigest()[:10]
        saved = config_dir / f"{config_id}-{label}-{suffix}.json"
        atomic_json(saved, payload)
        return load_config(saved)

    if source_run.is_dir():
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
            run_path, checkpoint_path, job_name, phase = source_run, None, audit_name, "audit"
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

    runtime = runtime_config(run_path, checkpoint_path, phase)
    prepared = plan(runtime, job_name)
    if not prepared["ready"]:
        emit({"checkpoint": "paused_for_review", "reason": "registered job preflight blocked", "blockers": prepared["blockers"]})
        return 2
    campaign = {"schema": 1, "configHash": config["_hash"], "protocolHash": protocol_hash,
                "baseRun": str(base_run), "currentRun": str(run_path), "sourceRun": str(source_run),
                "checkpoint": str(checkpoint_path) if checkpoint_path else None, "resumeCount": resume_count,
                "trainJob": train_name, "auditJob": audit_name, "phase": phase}
    atomic_json(campaign_file, campaign)
    if phase == "audit" and previous_pause_hash is not None:
        fly_controls.archive_pause_request(run_path, sys.modules[__name__], previous_pause_hash)
    train_config = runtime
    train_run = str(run_path)
    if phase in ("train", "resume"):
        started = execute(runtime, job_name)
        emit({"checkpoint": "resume_started" if phase == "resume" else "training_started",
              "fromCheckpoint": str(checkpoint_path) if checkpoint_path else None, **started})
    else:
        audit_config = runtime

    previous = None
    while phase in ("train", "resume"):
        while True:
            if digest(config["_path"]) != config["_hash"] or digest(train_config["_path"]) != train_config["_hash"]:
                emit({"checkpoint": "paused_for_review", "reason": "configuration file changed during training"})
                return 2
            try:
                sample = status(train_config)
            except (OSError, RuntimeError, ValueError) as error:
                emit({"checkpoint": "paused_for_review", "reason": "process status inspection failed; run left untouched", "error": str(error)[:500]})
                return 2
            if sample.get("configChanged") or sample.get("job") != job_name:
                emit({"checkpoint": "paused_for_review", "reason": "tracked training identity changed", "status": sample})
                return 2
            if sample["state"] == "live":
                if sample.get("resourceGuardExceeded"):
                    emit({"checkpoint": "paused_for_review", "reason": "resource guard exceeded; process left untouched", "status": sample})
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
            emit({"checkpoint": "interrupted", "reason": "no result published; the next babysit invocation will validate and resume from the latest complete checkpoint", "run": train_run, "status": sample})
            return 2
        handle = read_json(state_path(train_config))
        if handle.get("job") != job_name or handle.get("run") != train_run:
            emit({"checkpoint": "paused_for_review", "reason": "tracked training identity changed", "run": train_run})
            return 2
        campaign["phase"] = "result_ready"
        atomic_json(campaign_file, campaign)
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
    audit_plan = plan(audit_config, audit_name)
    if not audit_plan["ready"]:
        emit({"checkpoint": "paused_for_review", "reason": "audit preflight blocked", "blockers": audit_plan["blockers"]})
        return 2
    if phase != "audit":
        raise ValueError("Unexpected babysit phase")
    if not (Path(audit_config["paths"]["run"]) / "audit.json").is_file():
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
            sample = status(audit_config)
        except (OSError, RuntimeError, ValueError) as error:
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
            if sample.get("resourceGuardExceeded"):
                emit({"checkpoint": "paused_for_review", "reason": "resource guard exceeded; process left untouched", "status": sample})
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


def wait_for_supervised_update(config, interval):
    run = local(config['paths']['run'])
    deadline = time.monotonic() + interval
    while time.monotonic() < deadline:
        if any((run / name).exists() for name in ('pause-request.json', 'paused.json', 'paused-audit.json')):
            time.sleep(1)
            return
        time.sleep(min(1, max(0, deadline - time.monotonic())))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    sub = parser.add_subparsers(dest="action", required=True)
    for action in ("plan", "start", "run"):
        sub.add_parser(action).add_argument("job")
    supervisor = sub.add_parser("babysit", help="run one registered train/resume through its audit, then stop")
    supervisor.add_argument("train_job", nargs="?", default="train")
    supervisor.add_argument("audit_job", nargs="?", default="audit")
    supervisor.add_argument("--interval", type=int, default=300)
    att = sub.add_parser("attach")
    att.add_argument("job")
    att.add_argument("--pid", type=int)
    for action in ("status", "verify", "pause"):
        sub.add_parser(action)
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
    args = parser.parse_args()
    config = load_config(args.config)
    if args.action in ("plan", "start", "run"):
        if args.job not in config["jobs"]:
            raise ValueError("Unknown job: " + args.job)
        result = plan(config, args.job) if args.action == "plan" else execute(config, args.job, args.action == "run")
        emit(result)
        return result.get("exitCode") or 0
    if args.action == "babysit":
        if args.train_job not in config["jobs"] or args.audit_job not in config["jobs"]:
            raise ValueError("Unknown registered train or audit job")
        return supervise(config, args.train_job, args.audit_job, args.interval)
    if args.action == "attach":
        emit(attach(config, args.job, args.pid or config["observe"]["pid"]))
    elif args.action == "status":
        emit(status(config))
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
            return fly_controls.pause(config, sys.modules[__name__])
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
