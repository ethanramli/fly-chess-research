"""Reproduce MBON05 transmitter/sign provenance without running the neural model."""
import ast
import csv
import gzip
import hashlib
import json
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

started = time.monotonic()
out = Path(__file__).parent
assert not (out / "result.json").exists() and not (out / "proposed-variant.json").exists(), "Never overwrite evidence"
roots_wanted = ["720575940621164720", "720575940630496374"]
base = Path(".cache/flywire-codex-783-verify")
archive = Path("research/literature/cesp99-retina-2026-10-28")


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


paths = [Path(".cache/full.npz"), Path(".cache/flywire-annotations-v2.1.0.tsv"),
    base / "neurons.csv.gz", base / "connections.csv.gz", base / "consolidated_cell_types.csv.gz",
    archive / "flychess/connectome/graph.py", archive / "flychess/connectome/load.py",
    Path(".codebase/src/supervised-baselines/trainer.mjs"), Path(".codebase/src/runtime/graph.mjs")]
hashes = {str(path): digest(path) for path in paths}
assert hashes[str(paths[0])] == "4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2"
assert hashes[str(paths[1])] == "30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6"
manifest = [json.loads(line) for line in (archive / "manifest.jsonl").read_text().splitlines()]
for entry in manifest:
    if entry["path"] in {"flychess/connectome/graph.py", "flychess/connectome/load.py"}:
        assert digest(archive / entry["path"]) == entry["sha256"]

# Reuse only the original pure label/aggregation functions, without imports or model construction.
namespace = {"np": np}
for path, wanted in [(archive / "flychess/connectome/load.py", {"aggregate_connections"}),
        (archive / "flychess/connectome/graph.py", {"neuron_nt_type", "edge_signs"})]:
    tree = ast.parse(path.read_text(encoding="utf-8-sig"))
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in wanted
        or isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "NT_SIGN" for t in node.targets)]
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), namespace)

annotations, neurons, primary = {}, {}, {}
with open(paths[1], encoding="utf-8", newline="") as stream:
    for row in csv.DictReader(stream, delimiter="\t"):
        annotations[row["root_id"]] = {key: row[key] for key in ["root_id", "cell_type", "hemibrain_type",
            "cell_class", "side", "known_nt", "known_nt_source", "top_nt", "top_nt_conf"]}
for filename, target in [("neurons.csv.gz", neurons), ("consolidated_cell_types.csv.gz", primary)]:
    with gzip.open(base / filename, "rt", encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream):
            if row["root_id"] in roots_wanted:
                target[row["root_id"]] = row
with np.load(paths[0], allow_pickle=False) as z:
    roots, stored_nt = z["root_ids"], z["nt_type"]
    ptr, col, count, sign = z["csr_indptr"], z["csr_indices"], z["syn_count"], z["sign"]
indices = [int(np.searchsorted(roots, int(root))) for root in roots_wanted]
assert [str(int(roots[i])) for i in indices] == roots_wanted
raw = []
with gzip.open(base / "connections.csv.gz", "rt", encoding="utf-8-sig", newline="") as stream:
    for row in csv.DictReader(stream):
        if row["pre_root_id"] in roots_wanted:
            raw.append(row)
            assert time.monotonic() - started < 300
pre, post, weights, edge_nt, neuropil = namespace["aggregate_connections"](
    np.array([roots_wanted.index(row["pre_root_id"]) for row in raw]),
    np.searchsorted(roots, np.array([int(row["post_root_id"]) for row in raw], dtype=np.int64)),
    np.array([int(row["syn_count"]) for row in raw]),
    np.array([row["nt_type"] for row in raw]), np.array([row["neuropil"] for row in raw]),
    len(roots))
for row in raw:
    q = int(np.searchsorted(roots, int(row["post_root_id"])))
    assert str(int(roots[q])) == row["post_root_id"]
input_nt = np.array([neurons[root]["nt_type"] for root in roots_wanted])
resolved = namespace["neuron_nt_type"](input_nt, pre, edge_nt, weights)
resolved_signs = namespace["edge_signs"](resolved)
cells = []
for source, (root, index) in enumerate(zip(roots_wanted, indices)):
    assert primary[root]["primary_type"] == annotations[root]["hemibrain_type"] == "MBON05"
    assert annotations[root]["known_nt"] == "glutamate"
    assert str(resolved[source]) == str(stored_nt[index])
    edge_indices = np.flatnonzero(col == index)
    posts = np.searchsorted(ptr, edge_indices, side="right") - 1
    assert {int(q): int(weight) for q, weight in zip(post[pre == source], weights[pre == source])} == {
        int(q): int(count[k]) for q, k in zip(posts, edge_indices)}
    assert np.all(sign[edge_indices] == resolved_signs[source])
    tally, class_synapses, grouped = Counter(), Counter(), defaultdict(lambda: dict(edges=0, synapses=0))
    for label, weight in zip(edge_nt[pre == source], weights[pre == source]):
        if label:
            tally[str(label)] += int(weight)
    edges = []
    for q, k in zip(posts, edge_indices):
        target_root = str(int(roots[q]))
        target = annotations[target_root]
        target_type = target["cell_type"] or target["hemibrain_type"]
        target_class = target["cell_class"] or "unclassified"
        weight = int(count[k])
        class_synapses[target_class] += weight
        group = grouped[target_type or "untyped"]
        group["edges"] += 1
        group["synapses"] += weight
        edges.append(dict(edgeIndex=int(k), targetIndex=int(q), targetRootId=target_root,
            targetType=target_type, targetClass=target_class, targetSide=target["side"],
            synapses=weight, storedSign=int(sign[k])))
    cells.append(dict(rootId=root, graphIndex=index, somaSide=annotations[root]["side"],
        annotation=annotations[root], codexNeuron=neurons[root],
        assignmentMethod="edge-label-weighted-fallback" if not input_nt[source] else "explicit-neuron-label",
        weightedEdgeLabelTally=dict(tally), resolvedTransmitter=str(resolved[source]),
        storedTransmitter=str(stored_nt[index]), storedOutgoingSign=int(resolved_signs[source]),
        outgoingEdges=len(edges), outgoingSynapses=int(count[edge_indices].sum()),
        targetClassSynapses=dict(class_synapses), targetTypeTotals=dict(grouped), edges=edges))
assert cells[0]["assignmentMethod"] == "edge-label-weighted-fallback"
assert [cell["storedTransmitter"] for cell in cells] == ["ACH", "GLUT"]
assert [cell["storedOutgoingSign"] for cell in cells] == [1, -1]
assert all(cell["outgoingEdges"] == 112 for cell in cells)
for path, expected in hashes.items():
    assert digest(path) == expected, "Source changed during trace"
assert time.monotonic() - started < 300
time.sleep(time.monotonic() - started)  # One-shot 0.5 duty pacing; no neural propagation.
result = dict(schema="mbon05-sign-provenance-v1", date="2026-11-01", inputs=hashes,
    scriptSha256=digest(__file__), cells=cells,
    scope="Static sparse-edge/transmitter provenance; no model propagation, learning or sign mutation",
    sourceCodeReuse="Only pure original aggregation, transmitter-resolution and sign-table functions",
    cpuDuty=0.5, elapsedSeconds=time.monotonic() - started)
variant = dict(schema="mbon05-prospective-sign-overlay-v1", status="unapplied-proposal",
    parentGraphSha256=hashes[str(paths[0])], parentSourceResult="result.json",
    hypothesis="Curated glutamatergic type identity plus the baseline inhibitory-glutamate approximation",
    transmitterOverride=dict(rootId=cells[0]["rootId"], graphIndex=cells[0]["graphIndex"],
        previous="ACH", proposed="GLUT", evidence="Aso 2014 anatomy Table 1 / v2.1 known_nt"),
    edgeSignOverrides=[dict(edgeIndex=edge["edgeIndex"], presynapticRootId=cells[0]["rootId"],
        postsynapticRootId=edge["targetRootId"], previous=1, proposed=-1) for edge in cells[0]["edges"]],
    preserved="Root IDs, topology, synapse counts and every other source sign",
    limitations=["Not a measured receptor map or universal glutamate polarity",
        "Not behavioral valence, a production move coefficient or a repair proven by learning",
        "Requires a separately approved/pinned graph/model/reader/memory protocol before use"],
    experimentLaunched=False)
for name, value in [("result.json", result), ("proposed-variant.json", variant)]:
    with open(out / name, "x", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")
print(json.dumps(dict(status="pass", cells=[{k: cell[k] for k in ["rootId", "assignmentMethod",
    "resolvedTransmitter", "storedOutgoingSign", "outgoingEdges"]} for cell in cells],
    proposedSignChanges=len(variant["edgeSignOverrides"]), variantApplied=False, result=str(out / "result.json"))))
