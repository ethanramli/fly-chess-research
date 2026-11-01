"""Compare the complete Shiu table with the cache already matched to full.npz.

Uses the review environment's installed pyarrow; no package installation or simulation.
Run from the repository root with that environment's Python and --source-dir.
"""
import argparse
import csv
import gzip
import hashlib
import json
import time
from pathlib import Path

import pyarrow.parquet as pq

parser = argparse.ArgumentParser()
parser.add_argument("--source-dir", type=Path, required=True)
args = parser.parse_args()
started = time.monotonic()
output = Path(__file__).with_name("complete-source-result.json")
assert not output.exists(), "Never overwrite evidence"


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


annotations = Path(".cache/flywire-annotations-v2.1.0.tsv")
cache = Path(".cache/flywire-codex-783-verify/connections.csv.gz")
connectivity = args.source_dir / "Connectivity_783.parquet"
completeness = args.source_dir / "Completeness_783.csv"
input_hashes = {str(p): digest(p) for p in [annotations, cache, connectivity, completeness]}
static = json.loads(Path(__file__).with_name("result.json").read_text())
assert input_hashes[str(annotations)] == static["inputs"]["annotations"]["sha256"]
assert input_hashes[str(cache)] == static["inputs"]["connections"]["sha256"]
kc, mbon = set(), {}
with open(annotations, encoding="utf-8", newline="") as stream:
    for row in csv.DictReader(stream, delimiter="\t"):
        if row["cell_class"] == "Kenyon_Cell":
            kc.add(row["root_id"])
        elif row["cell_class"] == "MBON":
            mbon[row["root_id"]] = row["cell_type"] or row["hemibrain_type"]
with open(completeness, encoding="utf-8-sig", newline="") as stream:
    reader = csv.reader(stream)
    next(reader)
    roots = [row[0] for row in reader]

all_pairs, cached_pairs = {}, {}
rows_read = 0
table = pq.ParquetFile(connectivity)
for batch in table.iter_batches(batch_size=65536,
        columns=["Presynaptic_Index", "Postsynaptic_Index", "Connectivity"], use_threads=False):
    assert time.monotonic() - started < 300, "Time limit"
    pre, post, weights = [column.to_pylist() for column in batch.columns]
    rows_read += len(pre)
    for p, q, weight in zip(pre, post, weights):
        p, q = roots[p], roots[q]
        if p in kc and q in mbon:
            assert int(weight) == weight and weight > 0
            all_pairs[p, q] = all_pairs.get((p, q), 0) + int(weight)
with gzip.open(cache, "rt", encoding="utf-8", newline="") as stream:
    for row in csv.DictReader(stream):
        p, q = row["pre_root_id"], row["post_root_id"]
        if p in kc and q in mbon:
            cached_pairs[p, q] = cached_pairs.get((p, q), 0) + int(row["syn_count"])
retained = {pair: weight for pair, weight in all_pairs.items() if weight >= 5}
assert retained == cached_pairs, "Complete source and actual-graph-matched cache differ"
assert len(retained) == static["kcMbon"]["retainedEdges"]

by_type = {}
for (p, q), weight in all_pairs.items():
    entry = by_type.setdefault(mbon[q], dict(edges=0, synapses=0, retainedEdges=0, retainedSynapses=0))
    entry["edges"] += 1
    entry["synapses"] += weight
    if weight >= 5:
        entry["retainedEdges"] += 1
        entry["retainedSynapses"] += weight
for path, expected in input_hashes.items():
    assert digest(path) == expected, "Input changed during audit"
result = dict(schema="neuron-reader-complete-source-audit-v1", inputs=input_hashes,
    scriptSha256=digest(__file__), completeRows=rows_read,
    kcMbonEdges=len(all_pairs), retainedEdges=len(retained),
    kcMbonSynapses=sum(all_pairs.values()), retainedSynapses=sum(retained.values()),
    exactRetainedRootPairAndWeightMatch=True, byType=by_type,
    scope="Static identity/count comparison; not propagation, learning or a weak-edge validity test",
    elapsedSeconds=time.monotonic() - started)
with open(output, "x", encoding="utf-8") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps({key: result[key] for key in ["kcMbonEdges", "retainedEdges", "kcMbonSynapses",
    "retainedSynapses", "exactRetainedRootPairAndWeightMatch", "elapsedSeconds"]}))
