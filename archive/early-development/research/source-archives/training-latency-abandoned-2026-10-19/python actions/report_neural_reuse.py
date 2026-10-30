"""Compact exact-state observations; never infer a speedup from equality."""
import argparse
import hashlib
import json
from pathlib import Path
from statistics import mean, median


def summarize(rows):
    return {
        "pairs": len(rows),
        "medianChangedFraction": median(r["changedFraction"] for r in rows),
        "minChangedFraction": min(r["changedFraction"] for r in rows),
        "maxChangedFraction": max(r["changedFraction"] for r in rows),
        "medianChangedByteFraction": median(r["changedFloat32ByteFraction"] for r in rows),
        "completelyUnchanged": sum(r["changedNeurons"] == 0 for r in rows),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    data = args.report.read_bytes()
    report = json.loads(data)
    if "observations" in report:
        observations = report["observations"]
        assert len(observations) == 912 and len(report["samples"]) == 72
        assert report["exactHistoricalReceipts"]
        assert len({r["stageId"] for r in observations}) == 24

        def causal_summary(rows):
            steps = [step for row in rows for step in row["steps"]]
            return {"steps": len(steps),
                    "meanReusableRowFraction": mean(s["reusableRowFraction"] for s in steps),
                    "meanReusableEdgeFraction": mean(s["reusableEdgeFraction"] for s in steps)}

        print(json.dumps({
            "report": str(args.report), "sha256": hashlib.sha256(data).hexdigest(),
            "scope": report["scope"], "neurons": report["neurons"],
            "summary": causal_summary(observations),
            "perPhase": {p: causal_summary([r for r in observations if r["stageId"].split(":")[0] == p])
                         for p in ["acquisition", "interference", "reversal"]},
            "perFrame": {str(i): causal_summary([r for r in observations if r["frame"] == i])
                         for i in range(19)},
            "peakRssMiB": report["peakRssMiB"],
            "limitation": "Fractions of row/edge work with equal arguments; no measured cache speedup.",
        }, separators=(",", ":")))
        return
    assert report["stages"] == 24 and report["frames"] == 1368
    adjacent = [r for r in report["rows"] if r["frame"] > 0]
    cross = report["crossRows"]
    assert len(adjacent) == 1296 and len(cross) == 912
    print(json.dumps({
        "report": str(args.report), "sha256": hashlib.sha256(data).hexdigest(),
        "scope": report["scope"], "neurons": report["neurons"],
        "adjacent": summarize(adjacent), "crossLesson": summarize(cross),
        "crossLessonByFrame": {str(i): summarize([r for r in cross if r["frame"] == i])
                               for i in range(19)},
        "peakRssMiB": report["peakRssMiB"], "elapsedSeconds": report["elapsedSeconds"],
        "limitations": report["limitations"],
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
