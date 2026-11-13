"""Validate a Science Review ledger and print its Markdown scorecard."""
import json
import re
import sys
from pathlib import Path


WORKSHEET = Path(__file__).resolve().parent.parent / "references/isef-grand-award-rubric.md"


def load_worksheet(track):
    worksheet = WORKSHEET.read_text(encoding="utf-8")
    section = worksheet.split("## Strict scoring worksheet", 1)[1]
    section = section.split("## Award points", 1)[0]
    tables = {}
    for line in section.splitlines():
        heading = re.fullmatch(r"\| (Science|Engineering|Shared) criterion \| Points \| .+ \|", line)
        if heading:
            rows = []
            tables[heading[1].lower()] = rows
        criterion = re.fullmatch(r"\| ([^|]+?) \| (\d+) \| .+ \|", line)
        if criterion:
            rows.append((criterion[1], int(criterion[2])))
    shared = tables["shared"]
    execution_start = 5 if track == "science" else 6
    groups = {
        "Question or problem": tables[track][:3],
        "Design and methodology": tables[track][3:execution_start],
        "Execution": tables[track][execution_start:],
        "Creativity and impact": shared[:2],
        "Display": shared[2:5],
        "Interview": shared[5:],
    }
    if tuple(sum(points for _, points in rows) for rows in groups.values()) != (10, 15, 20, 20, 10, 25):
        raise ValueError("worksheet section weights do not reconcile")
    names = [name for rows in groups.values() for name, _ in rows]
    if len(names) != 20 or len(set(names)) != 20:
        raise ValueError("worksheet must have 20 unique criteria per track")
    return groups


def score(ledger):
    track = ledger["track"]
    if track not in ("science", "engineering"):
        raise ValueError("track must be science or engineering")
    groups = load_worksheet(track)
    entries = {}
    for row in ledger["rows"]:
        name = row["criterion"]
        if name in entries:
            raise ValueError(f"duplicate row: {name}")
        entries[name] = row

    required = {name for criteria in groups.values() for name, _ in criteria}
    if set(entries) != required:
        missing = ", ".join(sorted(required - entries.keys()))
        extra = ", ".join(sorted(entries.keys() - required))
        raise ValueError(f"missing rows: {missing or 'none'}; unknown rows: {extra or 'none'}")

    rows = []
    totals = {}
    provisional = False
    for group, criteria in groups.items():
        group_scores = []
        for name, maximum in criteria:
            row = entries[name]
            earned = row["earned"]
            status = row["status"]
            if type(earned) is not int or not 0 <= earned <= maximum:
                raise ValueError(f"{name}: expected whole points from 0 to {maximum}")
            if status not in ("observed", "pending", "unavailable"):
                raise ValueError(f"{name}: invalid evidence status")
            if status != "observed":
                provisional = True
                if earned:
                    raise ValueError(f"{name}: {status} evidence earns zero")
            evidence = row["evidence"]
            next_step = row.get("next", "")
            if not isinstance(evidence, str) or not evidence.strip():
                raise ValueError(f"{name}: evidence locator or missing artifact is required")
            if earned < maximum and (not isinstance(next_step, str) or not next_step.strip()):
                raise ValueError(f"{name}: say how to earn the lost points")
            rows.append((name, earned, maximum - earned, maximum, status, evidence, next_step))
            group_scores.append((earned, maximum))
        totals[group] = tuple(map(sum, zip(*group_scores)))
    total = sum(earned for earned, _ in totals.values())
    research = sum(totals[group][0] for group in list(groups)[:4])
    return rows, totals, total, research, provisional


def cell(value):
    return str(value).replace("|", r"\|").replace("\n", " ")


def main():
    try:
        rows, totals, total, research, provisional = score(json.load(sys.stdin))
    except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
        print(f"Scorecard unavailable: {error}", file=sys.stderr)
        return 1
    suffix = " (provisional)" if provisional else ""
    print(f"**Overall: {total}/100{suffix}**")
    print(f"**Research: {research}/65 · Display: {totals['Display'][0]}/10 · Interview: {totals['Interview'][0]}/25**")
    print()
    print("| Section | Earned | Lost | Available |")
    print("| --- | ---: | ---: | ---: |")
    for name, (earned, maximum) in totals.items():
        print(f"| {name} | {earned} | {maximum - earned} | {maximum} |")
    print(f"| **Total** | **{total}** | **{100 - total}** | **100** |")
    print()
    print("| Criterion | Earned | Lost | Available | Status | Evidence and reason | What would earn the rest |")
    print("| --- | ---: | ---: | ---: | --- | --- | --- |")
    for row in rows:
        print("| " + " | ".join(map(cell, row)) + " |")
    return 0


if __name__ == "__main__":
    sys.exit(main())
