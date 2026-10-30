"""Run the pinned one-time Stage 1 synthetic data chain after final-source curation.

Steps (each refuses to overwrite its output): fetch final source PGNs, bind
histories, produce final families, independently audit all three splits.
Raw stdout/stderr stay under runs/stage1-synthetic-data-v1; only one compact
JSON line per step is printed. Final contents are never printed.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
PYTHON = Path(os.environ["USERPROFILE"]) / ".venv-class" / "Scripts" / "python.exe"
LOGS = ROOT / "runs" / "stage1-synthetic-data-v1"
CANDIDATES = "research/data/lichess-synthetic-stage1-source-candidates-v2-final"
PGN = "research/data/lichess-stage1-synthetic-final-pgn-v1"
FINAL_SOURCES = "research/data/lichess-stage1-synthetic-final-sources-v1.jsonl"
DATA = "research/data/lichess-stage1-synthetic-v1"
V7 = "research/data/lichess-stage1-prepared-batches-v7"
NODE = ["node", "--max-old-space-size=256"]


def chunks(split: str) -> list[str]:
    return [f"{V7}/{split}-chunk-{index:03d}/lessons.jsonl" for index in range(4)]


def repeat(flag: str, values: list[str]) -> list[str]:
    return [item for value in values for item in (flag, value)]


STEPS = [
    ("fetch-final-pgn", PGN, [str(PYTHON), "python actions/fetch_lichess_game_pgns_v6.py", "--rows", f"{CANDIDATES}/final.jsonl",
                              "--split", "final", "--manifest", f"{CANDIDATES}/manifest.json", "--out", PGN]),
    ("bind-final-sources", FINAL_SOURCES, [*NODE, ".codebase/scripts/data/bind-lichess-stage1-synthetic-sources-v1.mjs",
                                           "--rows", f"{CANDIDATES}/final.jsonl", "--games", PGN, "--split", "final",
                                           "--out", FINAL_SOURCES]),
    ("produce-final", f"{DATA}/final.jsonl", [*NODE, ".codebase/scripts/data/prepare-lichess-stage1-synthetic-families-v1.mjs",
                                              "--split", "final", "--sources", FINAL_SOURCES, "--out", DATA,
                                              "--max-attempts", "3000"]),
    ("audit", "research/reports/lichess-stage1-synthetic-data-audit-v1.json",
     [*NODE, ".codebase/scripts/data/audit-lichess-stage1-synthetic-families-v1.mjs", "--dir", DATA,
      *repeat("--train-sources", chunks("train")), *repeat("--validation-sources", chunks("validation")),
      "--final-sources", FINAL_SOURCES,
      "--data-audit", "research/reports/lichess-stage1-synthetic-data-audit-v1.json",
      "--acceptance-audit", "research/reports/lichess-stage1-synthetic-acceptance-audit-v1.json"]),
]


def main() -> int:
    LOGS.mkdir(parents=True, exist_ok=True)
    for name, output, argv in STEPS:
        if (ROOT / output).exists():
            print(json.dumps({"step": name, "state": "already-published", "output": output}))
            continue
        stdout, stderr = LOGS / f"{name}.stdout.txt", LOGS / f"{name}.stderr.txt"
        with stdout.open("xb") as out, stderr.open("xb") as err:
            code = subprocess.run(argv, cwd=ROOT, stdout=out, stderr=err).returncode
        last = stdout.read_text(encoding="utf-8", errors="replace").strip().splitlines()[-1:] if name != "produce-final" else []
        print(json.dumps({"step": name, "exitCode": code, "summary": last[0][:600] if last else None,
                          "logs": [str(stdout), str(stderr)]}))
        if code:
            print(json.dumps({"stopped": name, "errorTail": stderr.read_text(encoding="utf-8", errors="replace")[-800:]}))
            return code
    return 0


if __name__ == "__main__":
    sys.exit(main())
