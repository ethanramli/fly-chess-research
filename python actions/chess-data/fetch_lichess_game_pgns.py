"""Fetch bounded Lichess source games for already selected puzzle rows."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
from uuid import uuid4
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ENDPOINT = "https://lichess.org/api/games/export/_ids"
SPEC = "https://github.com/lichess-org/api/blob/master/doc/specs/tags/games/api-games-export-_ids.yaml"
MAX_ROWS = 4096
MAX_IDS = 300
MAX_INPUT = 64 * 1024 * 1024
MAX_GAME = 64 * 1024
MAX_RESPONSE = 24 * 1024 * 1024
GAME_ID = re.compile(r"^[A-Za-z0-9]{8}$")
EVENT = re.compile(r"(?m)^\[Event\s")
GAME_TAG = re.compile(r'(?m)^\[GameId "([A-Za-z0-9]{8})"\]\s*$')
SITE_TAG = re.compile(r'(?m)^\[Site "https://(?:www\.)?lichess\.org/([A-Za-z0-9]{8})/?"\]\s*$')
VARIANT_TAG = re.compile(r'(?m)^\[Variant "([^"]+)"\]\s*$')


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_split(game_id: str) -> str:
    digest = hashlib.sha256(f"lichess-game-split-v1:{game_id}".encode()).digest()
    value = int.from_bytes(digest[:4], "big") / 0x100000000
    return "train" if value < 0.8 else "validation" if value < 0.9 else "final"


def read_rows(path: Path, split: str) -> tuple[bytes, list[str], int]:
    if not path.is_file() or path.stat().st_size > MAX_INPUT:
        raise ValueError("Candidate rows are missing or exceed the 64 MiB input limit")
    raw = path.read_bytes()
    ids: set[str] = set()
    row_count = 0
    for line_number, raw_line in enumerate(raw.splitlines(), 1):
        if not raw_line.strip():
            continue
        row_count += 1
        if row_count > MAX_ROWS or len(raw_line) > 256 * 1024:
            raise ValueError("Candidate row count or row size exceeds the registered bound")
        try:
            row = json.loads(raw_line)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError(f"Invalid candidate JSONL row {line_number}") from error
        if row.get("schema") != "lichess-puzzle-source-row-v1":
            raise ValueError(f"Unsupported candidate schema at row {line_number}")
        game_id = row.get("source", {}).get("gameId")
        if not isinstance(game_id, str) or not GAME_ID.fullmatch(game_id):
            raise ValueError(f"Invalid source game ID at row {line_number}")
        url = urlsplit(row.get("source", {}).get("gameUrl", ""))
        parts = [part for part in url.path.split("/") if part]
        if url.scheme != "https" or url.hostname not in {"lichess.org", "www.lichess.org"}:
            raise ValueError(f"Invalid Lichess source URL at row {line_number}")
        if not parts or parts[0] != game_id or len(parts) > 2 or (len(parts) == 2 and parts[1] not in {"white", "black"}):
            raise ValueError(f"Source URL does not match game ID at row {line_number}")
        if split != "development" and source_split(game_id) != split:
            raise ValueError(f"Game {game_id} does not belong to requested {split} split")
        ids.add(game_id)
    if not row_count or not ids:
        raise ValueError("Candidate rows contain no source games")
    if len(ids) > MAX_IDS:
        raise ValueError("One request is limited to300 distinct game IDs")
    return raw, sorted(ids), row_count


def split_games(response: bytes, expected: set[str]) -> dict[str, bytes]:
    text = response.decode("utf-8", errors="strict")
    starts = [match.start() for match in EVENT.finditer(text)]
    if not starts or text[:starts[0]].strip():
        raise ValueError("Response is not a clean sequence of PGN games")
    games: dict[str, bytes] = {}
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else len(text)
        block = text[start:end].strip() + "\n"
        encoded = block.encode("utf-8")
        if len(encoded) > MAX_GAME:
            raise ValueError("A returned PGN exceeds the64 KiB history bound")
        ids = GAME_TAG.findall(block)
        sites = SITE_TAG.findall(block)
        if len(ids) != 1 or len(sites) != 1 or ids[0] != sites[0]:
            raise ValueError("PGN GameId and Site tags are missing or inconsistent")
        game_id = ids[0]
        if game_id not in expected or game_id in games:
            raise ValueError("PGN response contains an unexpected or duplicate game ID")
        variants = VARIANT_TAG.findall(block)
        if variants and variants != ["Standard"]:
            raise ValueError("Non-standard chess variants are not supported")
        if re.search(r'(?m)^\[(?:SetUp|FEN) "', block):
            raise ValueError("Non-standard starting positions are not supported")
        games[game_id] = encoded
    if set(games) != expected:
        missing = sorted(expected - set(games))
        raise ValueError(f"Incomplete PGN response; missing {len(missing)} requested game IDs")
    return games


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", required=True, type=Path, help="Curated candidate JSONL for one source split")
    parser.add_argument("--split", choices=("development", "train", "validation"), required=True)
    parser.add_argument("--out", required=True, type=Path, help="Fresh output directory")
    args = parser.parse_args()
    rows_path = args.rows.resolve()
    out = args.out.resolve()
    if out.exists():
        raise ValueError("Output directory already exists; preserve prior data")
    raw_rows, game_ids, row_count = read_rows(rows_path, args.split)

    data = ",".join(game_ids).encode("ascii")
    request = Request(ENDPOINT, data=data, method="POST", headers={
        "Content-Type": "text/plain",
        "Accept": "application/x-chess-pgn",
    })
    try:
        with urlopen(request, timeout=60) as response:
            if urlsplit(response.geturl()).hostname != "lichess.org":
                raise ValueError("Unexpected API redirect host")
            content_type = response.headers.get_content_type().lower()
            if content_type != "application/x-chess-pgn":
                raise ValueError(f"Expected PGN response, received {content_type}")
            response_bytes = response.read(MAX_RESPONSE + 1)
            if len(response_bytes) > MAX_RESPONSE:
                raise ValueError("PGN response exceeds the24 MiB bound")
            response_headers = str(response.headers)
            status = response.status
    except HTTPError as error:
        raise RuntimeError(f"Lichess API returned HTTP {error.code}") from error
    except (URLError, TimeoutError) as error:
        raise RuntimeError(f"Lichess API request failed: {error}") from error

    games = split_games(response_bytes, set(game_ids))
    out.parent.mkdir(parents=True, exist_ok=True)
    # Inherit workspace access; Python 3.14's private mkdtemp DACL makes a
    # published directory unreadable to the managed audit process.
    temp = out.with_name(out.name + '.partial-' + uuid4().hex)
    temp.mkdir()
    try:
        (temp / "response.pgn").write_bytes(response_bytes)
        (temp / "response-headers.txt").write_text(response_headers, encoding="utf-8")
        output_hashes = {}
        for game_id in game_ids:
            path = temp / f"{game_id}.pgn"
            path.write_bytes(games[game_id])
            output_hashes[path.name] = sha(games[game_id])
        manifest = {
            "schema": "lichess-source-game-pgn-batch-v1",
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "sourceSplit": args.split,
            "sourceRows": {"path": str(rows_path), "sha256": sha(raw_rows), "rowCount": row_count},
            "api": {"endpoint": ENDPOINT, "specification": SPEC, "status": status,
                    "contentType": "application/x-chess-pgn", "requestIds": game_ids,
                    "responseSha256": sha(response_bytes), "responseBytes": len(response_bytes)},
            "games": output_hashes,
            "status": "complete-response-id-coverage-verified",
            "scope": "Public standard-start source PGNs only; lesson history binding, consequences, family separation, and neural teaching require separate audits.",
        }
        (temp / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        os.replace(temp, out)
    except BaseException:
        # Keep the incomplete temporary directory as raw failure evidence.
        raise
    print(json.dumps({"status": "complete", "split": args.split, "sourceRows": row_count,
                      "distinctGames": len(games), "responseBytes": len(response_bytes),
                      "output": str(out)}, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
