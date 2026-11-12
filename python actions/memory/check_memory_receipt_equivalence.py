"""Stream the old grid; compare only the predeclared development cell with fresh recorded trajectories."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1048576), b""):
            digest.update(block)
    return digest.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", type=Path, required=True)
    parser.add_argument("--recorded", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.out.exists():
        raise ValueError("Refusing existing comparison output")
    required = {(seed, arm) for seed in range(1001, 1013) for arm in ("informative", "absent", "shuffled", "disabled")}
    fresh = {}
    with args.recorded.open(encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            key = row["seed"], row["arm"]
            if key not in required or key in fresh:
                raise ValueError("Unexpected/duplicate recorded trajectory")
            if (row["rule"], row["q"], row["relation"], row["w"], row["bg"]) != ("local-gated-v1", 0.25, "conflicting", 0, 0):
                raise ValueError("Recorded profile differs")
            fresh[key] = row
    if set(fresh) != required:
        raise ValueError("Missing recorded trajectories")
    seen, mismatches = set(), []
    with gzip.open(args.original, "rt", encoding="utf-8") as stream:
        for line in stream:
            row = json.loads(line)
            if (row.get("rule"), row.get("q"), row.get("relation"), row.get("w"), row.get("bg")) != ("local-gated-v1", 0.25, "conflicting", 0, 0):
                continue
            key = row["seed"], row["arm"]
            if key not in required or key in seen:
                raise ValueError("Unexpected/duplicate original trajectory")
            seen.add(key)
            if row != fresh[key]:
                mismatches.append({"seed": key[0], "arm": key[1], "fields": sorted(k for k in set(row) | set(fresh[key]) if row.get(k) != fresh[key].get(k))})
    if seen != required:
        raise ValueError("Missing original trajectories")
    result = {"status": "failed" if mismatches else "passed", "compared": len(seen), "required": len(required),
              "mismatches": mismatches, "originalSha256": sha256(args.original), "recordedSha256": sha256(args.recorded),
              "scope": "Exact JSON trajectory equality for one development cell; no learning improvement or held-out/biological claim."}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"status": result["status"], "compared": len(seen), "mismatches": len(mismatches), "out": str(args.out)}))
    return int(bool(mismatches))


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}))
        raise SystemExit(1)
