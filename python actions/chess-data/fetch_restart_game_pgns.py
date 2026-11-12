"""Selects restart games from the Lichess puzzle database and fetches their full histories. Only games whose old split was train, which no earlier experiment used, and whose restart bucket is train or development. Locked buckets are refused.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

from fetch_lichess_game_pgns_v3 import split_games

ENDPOINT = "https://lichess.org/api/games/export/_ids"
MAX_IDS = 300
MAX_RESPONSE = 24 * 1024 * 1024
GAME_ID = re.compile(r"^[A-Za-z0-9]{8}$")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def unit(text: str) -> float:
    return int.from_bytes(hashlib.sha256(text.encode()).digest()[:4], "big") / 0x100000000


def old_split(game_id: str) -> str:
    value = unit(f"lichess-game-split-v1:{game_id}")
    return "train" if value < 0.8 else "validation" if value < 0.9 else "final"


def restart_split(game_id: str) -> str:
    v = unit(f"fly-restart-split-v1:{game_id}")
    return ("train" if v < 0.70 else "development" if v < 0.80 else "locked-a" if v < 0.85
            else "locked-b" if v < 0.90 else "locked-c1" if v < 0.95 else "locked-c2")


def sample_key(game_id: str) -> str:
    return hashlib.sha256(f"fly-restart-sample-v1:{game_id}".encode()).hexdigest()


def game_id_of(url: str | None) -> str | None:
    first = urlsplit(url or "").path.strip("/").split("/")[0]
    return first if GAME_ID.fullmatch(first) else None


def select(csv_path: Path, old_ids: set[str], bucket: str, count: int, skip: int = 0):
    hasher = hashlib.sha256()

    def lines():
        with csv_path.open("rb") as handle:
            for raw in handle:
                hasher.update(raw)
                yield raw.decode("utf-8")

    counts = dict.fromkeys(("rowsRead", "uniqueGames", "oldTrain", "excludedOld", "inBucket", "badUrl"), 0)
    seen: set[str] = set()
    eligible: list[str] = []
    for row in csv.DictReader(lines()):
        counts["rowsRead"] += 1
        game_id = game_id_of(row.get("GameUrl"))
        if game_id is None:
            counts["badUrl"] += 1
            continue
        if game_id in seen:
            continue
        seen.add(game_id)
        counts["uniqueGames"] += 1
        if old_split(game_id) != "train":
            continue
        counts["oldTrain"] += 1
        # Rows of other buckets are skipped after reading only their game address.
        if restart_split(game_id) != bucket:
            continue
        counts["inBucket"] += 1
        if game_id in old_ids:
            counts["excludedOld"] += 1
            continue
        eligible.append(game_id)
    ids = sorted(eligible, key=sample_key)[skip:skip + count]  # skip > 0: the next games in the same fixed order (memory v6, 2026-11-05)
    return ids, counts, hasher.hexdigest()


def verify_exclusion(report_path: Path, old_ids_path: Path) -> None:
    report = json.loads(report_path.read_text(encoding="utf-8-sig"))
    if report.get("status") != "passed":
        raise ValueError("Exclusion report status is not 'passed'")
    if report.get("idsSha256") != sha(old_ids_path.read_bytes()):
        raise ValueError("Exclusion report does not match the old-ids file")


def fetch(ids: list[str], temp: Path) -> dict[str, bytes]:
    games: dict[str, bytes] = {}
    for batch_index, start in enumerate(range(0, len(ids), MAX_IDS)):
        if batch_index:
            time.sleep(1)
        batch = ids[start:start + MAX_IDS]
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
        except HTTPError as error:
            (temp / f"batch-{batch_index:03d}.http-error.bin").write_bytes(error.read(MAX_RESPONSE + 1))
            raise RuntimeError(f"Lichess API returned HTTP {error.code} in batch {batch_index}") from error
        except (URLError, TimeoutError) as error:
            raise RuntimeError(f"Lichess API request failed in batch {batch_index}: {error}") from error
        (temp / f"batch-{batch_index:03d}.response.pgn").write_bytes(body)
        (temp / f"batch-{batch_index:03d}.headers.txt").write_text(headers, encoding="utf-8")
        # split_games raises when any requested ID is missing from the response.
        games.update(split_games(body, set(batch)))
    return games


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path, help="Decoded Lichess puzzle CSV")
    parser.add_argument("--old-ids", required=True, type=Path, help="old-game-ids.txt")
    parser.add_argument("--exclusion-report", required=True, type=Path, help="report.json from verify-old-game-exclusion.mjs")
    parser.add_argument("--bucket", required=True, choices=("train", "development"))
    parser.add_argument("--count", required=True, type=int)
    parser.add_argument("--skip", default=0, type=int, help="Skip the first N games of the fixed sample order")
    parser.add_argument("--out", required=True, type=Path, help="Fresh output directory")
    parser.add_argument("--dry-run", action="store_true", help="Write selection.json only; no network")
    args = parser.parse_args(argv)
    if not 1 <= args.count <= MAX_IDS:
        raise ValueError(f"--count must be between 1 and {MAX_IDS}")
    out = args.out.resolve()
    if out.exists():
        raise ValueError("Output directory already exists; preserve prior data")
    verify_exclusion(args.exclusion_report, args.old_ids)
    old_bytes = args.old_ids.read_bytes()
    old_ids = {line.strip() for line in old_bytes.decode("utf-8").splitlines() if line.strip()}
    if args.skip < 0:
        raise ValueError("--skip must be 0 or more")
    ids, counts, csv_sha = select(args.csv, old_ids, args.bucket, args.count, args.skip)
    if len(ids) < args.count:
        raise ValueError(f"Only {len(ids)} eligible games for {args.count} requested")

    out.parent.mkdir(parents=True, exist_ok=True)
    temp = out.with_name(out.name + ".partial-" + uuid4().hex)
    temp.mkdir()
    games: dict[str, bytes] = {}
    try:
        selection = {
            "schema": "restart-game-selection-v1", "bucket": args.bucket, "count": args.count, "skip": args.skip, "ids": ids,
            "sampleRule": "first COUNT by sha256(fly-restart-sample-v1:id)",
            "csvSha256": csv_sha, "oldIdsSha256": sha(old_bytes),
            "exclusionReportSha256": sha(args.exclusion_report.read_bytes()), "counts": counts,
        }
        (temp / "selection.json").write_text(json.dumps(selection, indent=2) + "\n", encoding="utf-8")
        if not args.dry_run:
            games = fetch(ids, temp)
            (temp / "games.pgn").write_bytes(b"\n".join(games[game_id] for game_id in ids))
            manifest = {
                "schema": "restart-game-pgns-v1", "bucket": args.bucket, "requested": len(ids),
                "returned": len(games), "gamesSha256": sha((temp / "games.pgn").read_bytes()),
                "responseSha256": sha((temp / "batch-000.response.pgn").read_bytes()),
                "endpoint": ENDPOINT, "fetchedAt": datetime.now(timezone.utc).isoformat(),
            }
            (temp / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    except Exception as error:
        (temp / "fetch-failure.json").write_text(json.dumps({
            "status": "fetch-failed", "error": str(error), "requested": len(ids),
        }, indent=2) + "\n", encoding="utf-8")
        raise
    os.replace(temp, out)
    print(json.dumps({"status": "dry-run" if args.dry_run else "published", "bucket": args.bucket,
                      "requested": len(ids), "returned": len(games), "output": str(out)},
                     separators=(",", ":")))


if __name__ == "__main__":
    main()
