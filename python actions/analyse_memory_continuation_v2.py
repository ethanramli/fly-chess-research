"""Read-only comparison and phase-state diagnosis; no learner or held-out data import."""
import hashlib
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "runs/memory-retention-2026-10-31"
REPORT = ROOT / "research/reports/memory-retention-continuation-2026-10-31"


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def rows(path):
    with path.open(encoding="utf-8") as stream:
        for line in stream:
            if len(line) > 1048576:
                raise ValueError("Oversized evidence row")
            yield json.loads(line)


def main():
    output = REPORT / "development-comparison-v2.json"
    if output.exists():
        raise ValueError("Refusing existing analysis output")
    inputs, compared, trajectories = {}, {}, {}
    for name in ("ablation", "coupled", "metaplastic", "reservoir", "reservoir-rate"):
        directory = RAW / f"{name}-v1-dev"
        result_path = directory / "result.json"
        audit_path = RAW / f"{name}-v1-audit/result.json"
        result, audit = (json.loads(p.read_text(encoding="utf-8")) for p in (result_path, audit_path))
        if audit["status"] != "passed" or audit["checkedTrials"] != 6912 or result["evaluation"] != audit["evaluation"]:
            raise ValueError("Incomplete/mismatched audit")
        summary_path = directory / "summaries.jsonl"
        inputs.update({str(p.relative_to(ROOT)): sha(p) for p in (result_path, audit_path, summary_path)})
        records = list(rows(summary_path))
        if len(records) != 48:
            raise ValueError("Expected twelve development seeds and four arms")
        trajectories[name] = records
        evaluation = result["evaluation"]
        compared[name] = {key: evaluation[key] for key in ("RMedian", "mNormMedian", "gates", "allPass")}
        compared[name]["shuffledDiagnostic"] = result["shuffledDiagnostic"]

    # Compare every field except declared rule/full-state identities, which necessarily differ.
    original = ROOT / "runs/overnight-memory-plasticity-2026-10-31/receipt-repair-v3-dev/summaries.jsonl"
    old = {(r["seed"], r["arm"]): r for r in rows(original)}
    inputs[str(original.relative_to(ROOT))] = sha(original)
    excluded = {"rule", "initialStateHash", "finalStateHash"}
    normalize = lambda row: {key: value for key, value in row.items() if key not in excluded}
    mismatches = []
    for record in trajectories["ablation"]:
        key = record["seed"], record["arm"]
        if normalize(record) != normalize(old[key]):
            mismatches.append(key)
    if mismatches or len(old) != 48:
        raise ValueError(f"Zero-coupling behavior differs from original: {mismatches}")

    # Inspect published states only; do not replay or alter training.
    event_path = RAW / "metaplastic-v1-dev/events.jsonl"
    inputs[str(event_path.relative_to(ROOT))] = sha(event_path)
    phase, snapshots = {}, {}
    for row in rows(event_path):
        if row["kind"] == "start":
            config = row["config"]
        if row["kind"] != "test" or config["arm"] != "informative":
            continue
        snapshot = row["snapshot"]
        snapshots.setdefault(config["seed"], {})[row["test"]] = snapshot
        states = snapshot["states"]
        # Whole local population summaries avoid inferring biological times or exact cell identities.
        phase.setdefault(row["test"], []).append({
            "strongMass": statistics.mean(states[i] + states[i + 1] for i in range(0, len(states), 4)),
            "deepMass": statistics.mean(states[i + 1] + states[i + 3] for i in range(0, len(states), 4)),
            "gain": statistics.mean(snapshot["gains"]),
        })
    if set(phase) != {"T1", "T2", "T3", "T4", "T5"} or any(len(v) != 12 for v in phase.values()):
        raise ValueError("Missing informative phase snapshots")
    phase_medians = {test: {field: statistics.median(r[field] for r in records) for field in records[0]}
                     for test, records in phase.items()}
    erasure = []
    for seed, tests in snapshots.items():
        first, after = tests["T1"], tests["T2"]
        # Before B/C learning, noninitial hidden masses mark synapses changed by A's feedback.
        indices = [i for i in range(len(first["gains"])) if first["states"][4*i] != 1]
        erasure.append({"seed": seed, "AHistoryEdges": len(indices),
                        "changedDuringBC": sum(first["gains"][i] != after["gains"][i] for i in indices),
                        "meanAbsoluteGainChange": statistics.mean(abs(first["gains"][i]-after["gains"][i]) for i in indices)})
    baseline = {r["seed"]: r for r in trajectories["ablation"] if r["arm"] == "informative"}
    candidate = {r["seed"]: r for r in trajectories["metaplastic"] if r["arm"] == "informative"}
    paired_margin = {test: statistics.median(candidate[seed]["tests"][test]["A"]["mNorm"] - baseline[seed]["tests"][test]["A"]["mNorm"]
                                            for seed in baseline) for test in ("T1", "T2", "T3", "T4", "T5")}
    data = {"status": "complete", "scope": "Same one development cell, paired seeds; no independent replication or biological retention claim",
            "inputs": inputs, "candidates": compared,
            "ablationEquivalence": {"matched": 48, "excludedIdentityFields": sorted(excluded)},
            "metaplasticPhasePopulationMedians": phase_medians, "metaplasticAHistoryChanges": erasure,
            "metaplasticMinusAblationPairedAMarginMedian": paired_margin}
    with output.open("x", encoding="utf-8") as stream:
        json.dump(data, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"status": "complete", "ablationMatches": 48, "out": str(output)}))


if __name__ == "__main__":
    main()
