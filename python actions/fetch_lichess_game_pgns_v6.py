"""Fetch bounded Lichess source PGNs in API-sized batches.

v6 also accepts the sealed final split for blind synthetic-family production. Final
candidates are checked against their curator manifest only; the history binder and
independent family audit replay every source game before any use.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

from fetch_lichess_game_pgns_v3 import split_games

ENDPOINT = "https://lichess.org/api/games/export/_ids"
MAX_ROWS = 4096
MAX_IDS = 300
MAX_INPUT = 64 * 1024 * 1024
MAX_GAME = 64 * 1024
MAX_RESPONSE = 24 * 1024 * 1024
MAX_TOTAL_RESPONSE = 96 * 1024 * 1024
GAME_ID = re.compile(r"^[A-Za-z0-9]{8}$")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_split(game_id: str) -> str:
    raw = hashlib.sha256(f"lichess-game-split-v1:{game_id}".encode()).digest()
    value = int.from_bytes(raw[:4], "big") / 0x100000000
    return "train" if value < 0.8 else "validation" if value < 0.9 else "final"


def read_ids(path: Path, split: str) -> tuple[bytes, list[str], int]:
    if not path.is_file() or path.stat().st_size > MAX_INPUT:
        raise ValueError("Candidate rows are missing or exceed the 64 MiB input limit")
    raw = path.read_bytes()
    ids: set[str] = set()
    rows = 0
    for line_number, line in enumerate(raw.splitlines(), 1):
        if not line.strip():
            continue
        rows += 1
        if rows > MAX_ROWS or len(line) > 256 * 1024:
            raise ValueError("Candidate row count or row size exceeds its bound")
        try:
            row = json.loads(line)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError(f"Invalid candidate JSONL row {line_number}") from error
        if row.get("schema") != "lichess-puzzle-source-row-v1":
            raise ValueError(f"Unsupported candidate schema at row {line_number}")
        source = row.get("source", {})
        game_id = source.get("gameId")
        if not isinstance(game_id, str) or not GAME_ID.fullmatch(game_id):
            raise ValueError(f"Invalid source game ID at row {line_number}")
        url = urlsplit(source.get("gameUrl", ""))
        parts = [part for part in url.path.split("/") if part]
        if (url.scheme != "https" or url.hostname not in {"lichess.org", "www.lichess.org"}
                or not parts or parts[0] != game_id or len(parts) > 2
                or (len(parts) == 2 and parts[1] not in {"white", "black"})):
            raise ValueError(f"Source URL does not match game ID at row {line_number}")
        if source_split(game_id) != split:
            raise ValueError(f"Game {game_id} is outside the registered {split} split")
        ids.add(game_id)
    if not rows or not ids:
        raise ValueError("Candidate rows contain no source games")
    return raw, sorted(ids), rows


def verify_selection(rows: bytes, row_count: int, split: str, manifest_path: Path, audit_path: Path | None) -> None:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    if split != "final" and audit_path is None:
        raise ValueError("Train and validation fetches require a pinned source audit")
    audit = json.loads(audit_path.read_text(encoding="utf-8-sig")) if audit_path else {}
    if manifest.get("schema") != "lichess-puzzle-corpus-v2":
        raise ValueError("Unsupported source candidate manifest")
    if manifest.get("outputs", {}).get(f"{split}.jsonl") != sha(rows):
        raise ValueError("Candidate rows differ from the pinned source manifest")
    if manifest.get("counts", {}).get("selected", {}).get(split) != row_count:
        raise ValueError("Candidate row count differs from the source manifest")
    selected = manifest.get("counts", {}).get("selected", {})
    if any(selected.get(name) != (row_count if name == split else 0)
           for name in ("train", "validation", "final")):
        raise ValueError("Candidate manifest includes rows outside the requested split")
    if split == "final":
        return
    if (audit.get("schema") != "lichess-source-candidate-audit-v1"
            or audit.get("sourceChecksPassed") is not True
            or audit.get("manifestSha256") != sha(manifest_path.read_bytes())
            or audit.get("checkedSplits") != {"train": row_count if split == "train" else 0,
                                               "validation": row_count if split == "validation" else 0}
            or audit.get("finalSplitInspected") is not False):
        raise ValueError("Pinned source audit does not verify the requested source split")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", required=True, type=Path)
    parser.add_argument("--split", choices=("train", "validation", "final"), required=True)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--source-audit", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    rows_path = args.rows.resolve()
    out = args.out.resolve()
    if out.exists():
        raise ValueError("Output directory already exists; preserve prior data")
    raw_rows, game_ids, row_count = read_ids(rows_path, args.split)
    verify_selection(raw_rows, row_count, args.split, args.manifest.resolve(),
                     args.source_audit.resolve() if args.source_audit else None)

    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(out.name + ".partial-" + uuid4().hex)
    temp.mkdir()
    calls = []
    try:
        total_bytes = 0
        for batch_index, start in enumerate(range(0, len(game_ids), MAX_IDS)):
            if batch_index:
                time.sleep(1)
            batch = game_ids[start:start + MAX_IDS]
            request = Request(ENDPOINT, data=",".join(batch).encode("ascii"), method="POST", headers={
                "Content-Type": "text/plain", "Accept": "application/x-chess-pgn",
            })
            try:
                with urlopen(request, timeout=60) as response:
                    if urlsplit(response.geturl()).hostname != "lichess.org":
                        raise ValueError("Unexpected API redirect host")
                    if response.headers.get_content_type().lower() != "application/x-chess-pgn":
                        raise ValueError("Lichess returned a non-PGN content type")
                    body = response.read(MAX_RESPONSE + 1)
                    if len(body) > MAX_RESPONSE:
                        raise ValueError("A PGN batch exceeds the 24 MiB response bound")
                    headers = str(response.headers)
                    status = response.status
            except HTTPError as error:
                error_body = error.read(MAX_RESPONSE + 1)
                (temp / f"batch-{batch_index:03d}.http-error.bin").write_bytes(error_body)
                raise RuntimeError(f"Lichess API returned HTTP {error.code} in batch {batch_index}") from error
            except (URLError, TimeoutError) as error:
                raise RuntimeError(f"Lichess API request failed in batch {batch_index}: {error}") from error

            total_bytes += len(body)
            if total_bytes > MAX_TOTAL_RESPONSE:
                raise ValueError("Combined PGN responses exceed the 96 MiB bound")
            (temp / f"batch-{batch_index:03d}.response.pgn").write_bytes(body)
            (temp / f"batch-{batch_index:03d}.headers.txt").write_text(headers, encoding="utf-8")
            games = split_games(body, set(batch))
            for game_id, pgn in games.items():
                if len(pgn) > MAX_GAME:
                    raise ValueError(f"PGN {game_id} exceeds the 64 KiB history bound")
                (temp / f"{game_id}.pgn").write_bytes(pgn)
            calls.append({"index": batch_index, "requestedIds": batch, "status": status,
                          "responseBytes": len(body), "responseSha256": sha(body),
                          "headersSha256": sha(headers.encode("utf-8"))})

        manifest = {"schema": "lichess-source-pgn-batches-v1", "split": args.split,
                    "candidateRows": str(rows_path), "candidateRowsSha256": sha(raw_rows),
                    "candidateRowCount": row_count, "uniqueGameCount": len(game_ids),
                    "endpoint": ENDPOINT, "calls": calls, "totalResponseBytes": total_bytes,
                    "games": {game_id: sha((temp / f"{game_id}.pgn").read_bytes()) for game_id in game_ids},
                    "finalSplitInspected": False, "neuralEventsDelivered": 0,
                    "graphLaunchAuthorized": False,
                    "scope": "Source PGN acquisition only; histories, puzzle consequences, family separation, and teaching eligibility require independent audits. Final PGNs are stored blind and are not reviewed."}
        (temp / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.replace(temp, out)
    except Exception as error:
        (temp / "fetch-failure.json").write_text(json.dumps({
            "status": "fetch-failed", "error": str(error), "batchesCompleted": len(calls),
            "completedCalls": calls, "candidateRowsSha256": sha(raw_rows),
            "finalSplitInspected": False, "graphLaunchAuthorized": False,
        }, indent=2) + "\n", encoding="utf-8")
        raise
    print(json.dumps({"status": "source-published", "split": args.split,
                      "candidateRows": row_count, "uniqueGames": len(game_ids),
                      "batches": len(calls), "responseBytes": total_bytes,
                      "output": str(out), "finalSplitInspected": False,
                      "graphLaunchAuthorized": False}, separators=(",", ":")))


if __name__ == "__main__":
    main()
