"""Bounded software tests for the restart game fetcher; no network and no graph."""
import csv
import hashlib
import io
import json
import shutil
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fetch_restart_game_pgns as fetcher  # noqa: E402

TESTS_DIR = Path(__file__).resolve().parents[2] / "runs/python-actions/action-tests"


def inline_unit(text):
    return int.from_bytes(hashlib.sha256(text.encode()).digest()[:4], "big") / 0x100000000


def inline_old(game_id):
    v = inline_unit(f"lichess-game-split-v1:{game_id}")
    return "train" if v < 0.8 else "validation" if v < 0.9 else "final"


def inline_restart(game_id):
    v = inline_unit(f"fly-restart-split-v1:{game_id}")
    for limit, name in ((0.70, "train"), (0.80, "development"), (0.85, "locked-a"),
                        (0.90, "locked-b"), (0.95, "locked-c1")):
        if v < limit:
            return name
    return "locked-c2"


def inline_sample_key(game_id):
    return hashlib.sha256(f"fly-restart-sample-v1:{game_id}".encode()).hexdigest()


def find_id(predicate, used):
    for n in range(100000):
        game_id = f"Z{n:07d}"
        if game_id not in used and predicate(game_id):
            used.add(game_id)
            return game_id
    raise AssertionError("no fixture id found")


def pgn_for(game_id):
    return (f'[Event "Rated Standard game"]\n[Site "https://lichess.org/{game_id}"]\n'
            f'[GameId "{game_id}"]\n[Variant "Standard"]\n\n1. e4 e5 1-0\n')


class FetchRestartTests(unittest.TestCase):
    def setUp(self):
        TESTS_DIR.mkdir(parents=True, exist_ok=True)
        # Inherited workspace permissions keep these fixtures readable under the managed token.
        self.root = TESTS_DIR / f"fetch-restart-{uuid4().hex}"
        self.root.mkdir()

    def tearDown(self):
        assert self.root.resolve().is_relative_to(TESTS_DIR.resolve())
        shutil.rmtree(self.root)

    def _fixture(self):
        used = set()
        eligible = [find_id(lambda g: fetcher.old_split(g) == "train" and fetcher.restart_split(g) == "train", used)
                    for _ in range(3)]
        excluded = find_id(lambda g: fetcher.old_split(g) == "train" and fetcher.restart_split(g) == "train", used)
        validation = find_id(lambda g: fetcher.old_split(g) == "validation" and fetcher.restart_split(g) == "train", used)
        development = find_id(lambda g: fetcher.old_split(g) == "train" and fetcher.restart_split(g) == "development", used)
        locked = find_id(lambda g: fetcher.old_split(g) == "train" and fetcher.restart_split(g) == "locked-a", used)
        urls = [f"https://lichess.org/{g}/black" for g in eligible + [excluded, validation, development, locked]]
        urls.append(f"https://lichess.org/{eligible[0]}/white")  # duplicate game, different side
        urls.append("https://lichess.org/short")  # bad URL
        csv_path = self.root / "puzzles.csv"
        with csv_path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow("PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags,DailyDate".split(","))
            for index, url in enumerate(urls):
                writer.writerow([f"p{index}", "fen", "e2e4", "1500", "80", "90", "10", "x", url, "", "2026-01-01"])
        old_ids_path = self.root / "old-game-ids.txt"
        old_ids_path.write_text(excluded + "\n", encoding="utf-8")
        report_path = self.root / "report.json"
        report_path.write_text(json.dumps({"status": "passed", "idsSha256": hashlib.sha256(
            old_ids_path.read_bytes()).hexdigest()}), encoding="utf-8")
        expected = sorted(eligible, key=inline_sample_key)
        return {"csv": csv_path, "old_ids": old_ids_path, "report": report_path, "expected": expected,
                "excluded": excluded}

    def test_splits_match_inline_recomputation(self):
        for n in range(50):
            game_id = f"Ab{n:06d}"
            self.assertEqual(fetcher.old_split(game_id), inline_old(game_id))
            self.assertEqual(fetcher.restart_split(game_id), inline_restart(game_id))

    def test_select_returns_only_eligible_games_in_sample_order(self):
        fixture = self._fixture()
        ids, counts, csv_sha = fetcher.select(fixture["csv"], {fixture["excluded"]}, "train", 3)
        self.assertEqual(ids, fixture["expected"])
        self.assertEqual(counts, {"rowsRead": 9, "uniqueGames": 7, "oldTrain": 6,
                                  "excludedOld": 1, "inBucket": 4, "badUrl": 1})
        self.assertEqual(csv_sha, hashlib.sha256(fixture["csv"].read_bytes()).hexdigest())
        # skip continues the same fixed order without overlap (memory v6)
        first, _, _ = fetcher.select(fixture["csv"], {fixture["excluded"]}, "train", 2)
        rest, _, _ = fetcher.select(fixture["csv"], {fixture["excluded"]}, "train", 2, skip=2)
        self.assertEqual(first + rest, fetcher.select(fixture["csv"], {fixture["excluded"]}, "train", 4)[0])
        self.assertFalse(set(first) & set(rest))

    def test_verify_exclusion_rejects_failed_report_and_hash_mismatch(self):
        fixture = self._fixture()
        report = json.loads(fixture["report"].read_text())
        report["status"] = "failed"
        fixture["report"].write_text(json.dumps(report))
        with self.assertRaisesRegex(ValueError, "status"):
            fetcher.verify_exclusion(fixture["report"], fixture["old_ids"])
        report["status"] = "passed"
        report["idsSha256"] = "0" * 64
        fixture["report"].write_text(json.dumps(report))
        with self.assertRaisesRegex(ValueError, "does not match"):
            fetcher.verify_exclusion(fixture["report"], fixture["old_ids"])
        report["idsSha256"] = hashlib.sha256(fixture["old_ids"].read_bytes()).hexdigest()
        fixture["report"].write_text(json.dumps(report))
        fetcher.verify_exclusion(fixture["report"], fixture["old_ids"])

    def _argv(self, fixture, out, *extra):
        return ["--csv", str(fixture["csv"]), "--old-ids", str(fixture["old_ids"]),
                "--exclusion-report", str(fixture["report"]), "--bucket", "train",
                "--count", "3", "--out", str(out), *extra]

    def test_main_dry_run_writes_selection_only_and_refuses_existing_out(self):
        fixture = self._fixture()
        out = self.root / "selection-out"
        with redirect_stdout(io.StringIO()):
            fetcher.main(self._argv(fixture, out, "--dry-run"))
        self.assertEqual(sorted(p.name for p in out.iterdir()), ["selection.json"])
        selection = json.loads((out / "selection.json").read_text())
        self.assertEqual(selection["ids"], fixture["expected"])
        self.assertEqual(selection["schema"], "restart-game-selection-v1")
        with self.assertRaisesRegex(ValueError, "already exists"):
            fetcher.main(self._argv(fixture, out, "--dry-run"))

    def test_fetch_returns_games_and_refuses_missing_ids(self):
        ids = ["AAAAAAAA", "BBBBBBBB"]
        body = (pgn_for("AAAAAAAA") + "\n" + pgn_for("BBBBBBBB")).encode("utf-8")

        class FakeHeaders:
            def get_content_type(self):
                return "application/x-chess-pgn"

            def __str__(self):
                return "Content-Type: application/x-chess-pgn\n"

        class FakeResponse:
            status = 200
            headers = FakeHeaders()

            def geturl(self):
                return fetcher.ENDPOINT

            def read(self, limit):
                return body

            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

        temp = self.root / "fetch-temp"
        temp.mkdir()
        with patch.object(fetcher, "urlopen", return_value=FakeResponse()):
            games = fetcher.fetch(ids, temp)
        self.assertEqual(set(games), set(ids))
        self.assertIn(b"1. e4 e5 1-0", games["AAAAAAAA"])
        with patch.object(fetcher, "urlopen", return_value=FakeResponse()):
            with self.assertRaisesRegex(ValueError, "missing 1"):
                fetcher.fetch(ids + ["CCCCCCCC"], temp)


if __name__ == "__main__":
    unittest.main()
