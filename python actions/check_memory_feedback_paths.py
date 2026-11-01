"""Static sparse anatomy only: no neural dynamics, plasticity, labels or graph mutations."""
import csv
import gzip
import json
import os
from pathlib import Path
import time
import numpy as np
from curriculum import digest, inventory

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "research/reports/memory-retention-continuation-2026-10-31/feedback-path-feasibility-v1.json"
POOLS = {"MBON05": "PAM08", "MBON27": "PAM01", "MBON09": "PAM12", "MBON07": "PAM11", "MBON06": "PAM10"}
FILES = {"graph": ROOT / ".cache/full.npz", "annotations": ROOT / ".cache/flywire-annotations-v2.1.0.tsv",
         "types": ROOT / ".cache/flywire-codex-783-verify/consolidated_cell_types.csv.gz"}
started = time.monotonic()


def guard():
    inv = inventory()
    own = next(row for row in inv["processes"] if row["pid"] == os.getpid())
    if own["workingSetMiB"] is None or own["workingSetMiB"] > 2048 or inv["freeMiB"] < 256 or time.monotonic()-started > 300:
        raise RuntimeError("Static audit resource guard")
    return {"observedRssMiB": own["workingSetMiB"], "freeMiB": inv["freeMiB"]}


def main():
    if OUTPUT.exists():
        raise ValueError("Refusing existing static audit")
    before = guard()
    hashes = {name: digest(path) for name, path in FILES.items()}
    with np.load(FILES["graph"], allow_pickle=False) as archive:
        roots, ptr, col, syn, sign = (archive[key] for key in ("root_ids", "csr_indptr", "csr_indices", "syn_count", "sign"))
    index = {str(root): i for i, root in enumerate(roots)}
    if len(index) != len(roots) or len(ptr) != len(roots)+1 or ptr[0] != 0 or ptr[-1] != len(col) or len(syn) != len(col) or len(sign) != len(col):
        raise ValueError("Invalid sparse graph dimensions")
    if np.any(ptr[1:] < ptr[:-1]) or np.any(col < 0) or np.any(col >= len(roots)) or np.any(syn < 0) or np.any((sign != -1) & (sign != 1)):
        raise ValueError("Invalid sparse graph values")
    cells = {}
    with FILES["annotations"].open(encoding="utf-8", newline="") as stream:
        for row in csv.DictReader(stream, delimiter="\t"):
            i = index.get(row["root_id"])
            if i is not None:
                cells[i] = {key: row[key] for key in ("root_id", "hemibrain_type", "cell_class", "side")}
    visual = set()
    with gzip.open(FILES["types"], "rt", encoding="utf-8", newline="") as stream:
        for row in csv.DictReader(stream):
            i = index.get(row["root_id"])
            if i is not None and row["primary_type"] in ("KCg-d", "KCab-p"):
                visual.add(i)
    receivers = {i: {**row, "index": i, "sourceCompatibleExamplePool": POOLS[row["hemibrain_type"]], "visualKCEdges": 0,
                     "visualKCSynapses": 0, "directDANEdges": []} for i, row in cells.items() if row["hemibrain_type"] in POOLS}
    for i, cell in receivers.items():
        for edge in range(ptr[i], ptr[i+1]):
            if int(col[edge]) in visual:
                cell["visualKCEdges"] += 1
                cell["visualKCSynapses"] += int(syn[edge])
    for d, target in cells.items():
        if target["cell_class"] != "DAN":
            continue
        for edge in range(ptr[d], ptr[d+1]):
            pre = int(col[edge])
            if pre in receivers:
                receivers[pre]["directDANEdges"].append({"edge": edge, "targetIndex": d, "target": target,
                                                        "sign": int(sign[edge]), "synapses": int(syn[edge])})
    summary = {}
    for name, pool in POOLS.items():
        selected = [cell for cell in receivers.values() if cell["hemibrain_type"] == name]
        edges = [edge for cell in selected for edge in cell["directDANEdges"] if edge["target"]["hemibrain_type"] == pool]
        summary[name] = {"examplePool": pool, "receiverCells": len(selected), "visualKCSynapses": sum(c["visualKCSynapses"] for c in selected),
                         "directExampleEdges": len(edges), "signedExampleSynapses": {str(s): sum(e["synapses"] for e in edges if e["sign"] == s) for s in (-1, 1)}}
    # Pace the bounded one-shot read; this is duty scheduling, not an OS CPU cap.
    work = time.monotonic()-started
    time.sleep(work)
    after = guard()
    data = {"status": "complete", "scope": "Static anatomy only; direct pools are examples, unresolved subtypes/valence/dynamics; no graph activity or learning",
            "inputs": hashes, "nodes": len(roots), "edges": len(col), "summary": summary, "cells": list(receivers.values()),
            "resources": {"before": before, "after": after, "wallSeconds": time.monotonic()-started, "cpuDuty": .5}}
    with OUTPUT.open("x", encoding="utf-8") as stream:
        json.dump(data, stream, indent=2)
        stream.write("\n")
    print(json.dumps({"status": "complete", "receiverCells": len(receivers), "out": str(OUTPUT)}))


if __name__ == "__main__":
    main()
