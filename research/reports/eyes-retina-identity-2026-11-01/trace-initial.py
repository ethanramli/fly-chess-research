"""Static source/placement trace. Run from the repo root with the existing NumPy environment."""
import csv
import gzip
import hashlib
import json
import math
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

started = time.monotonic()
output = Path(__file__).with_name("result.json")
assert not output.exists(), "Never overwrite evidence"
base = Path(".cache/flywire-codex-783-verify")
graph_path = Path(".cache/full.npz")
annotations = Path(".cache/flywire-annotations-v2.1.0.tsv")
source_base = Path("research/literature/cesp99-retina-2026-10-28")


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


inputs = [graph_path, annotations, base / "consolidated_cell_types.csv.gz",
    base / "classification.csv.gz", base / "column_assignment.csv.gz",
    source_base / "flychess/connectome/load.py", source_base / "flychess/connectome/retina.py",
    source_base / "manifest.jsonl", Path(".codebase/src/chess-input/eyes-v1.mjs")]
hashes = {str(p): digest(p) for p in inputs}
assert hashes[str(graph_path)] == "4d63295f5e0d9b9ca7b4cf7802f975c2fc9fad87f29ee451305ccab5de02abe2"
assert hashes[str(annotations)] == "30be6c73975a70c56d930e27911f36455d3886e15abf383b78edd2a5d679e0b6"
assert hashes[str(base / "consolidated_cell_types.csv.gz")] == "8aba246d71dc40361677493629972ce3883048c3d02010adc42bda22962a1a2d"
for line in (source_base / "manifest.jsonl").read_text().splitlines():
    entry = json.loads(line)
    if entry["path"] in {"flychess/connectome/load.py", "flychess/connectome/retina.py"}:
        assert digest(source_base / entry["path"]) == entry["sha256"]

with np.load(graph_path, allow_pickle=False) as z:
    roots = [str(int(x)) for x in z["root_ids"]]
    retina = z["retina_idx"].tolist()
    types = z["retina_type"].tolist()
    eyes = z["retina_eye"].tolist()
    squares = z["retina_square"].tolist()
    uv = z["retina_uv"].copy()
    ptr, col, syn = z["csr_indptr"], z["csr_indices"], z["syn_count"]
    meta = json.loads(str(z["meta"]))
assert len(set(retina)) == len(retina)
selected = {roots[i] for i in retina}
primary, classification, columns, tsv = {}, {}, {}, {}
with gzip.open(base / "consolidated_cell_types.csv.gz", "rt", encoding="utf-8-sig", newline="") as stream:
    for row in csv.DictReader(stream):
        assert row["root_id"] not in primary
        primary[row["root_id"]] = row["primary_type"]
with gzip.open(base / "classification.csv.gz", "rt", encoding="utf-8-sig", newline="") as stream:
    for row in csv.DictReader(stream):
        if row["root_id"] in selected:
            assert row["root_id"] not in classification
            classification[row["root_id"]] = row
with gzip.open(base / "column_assignment.csv.gz", "rt", encoding="utf-8-sig", newline="") as stream:
    for row in csv.DictReader(stream):
        assert row["root_id"] not in columns
        columns[row["root_id"]] = row
with open(annotations, encoding="utf-8", newline="") as stream:
    for row in csv.DictReader(stream, delimiter="\t"):
        if row["root_id"] in selected:
            assert row["root_id"] not in tsv
            tsv[row["root_id"]] = row
assert set(classification) == set(tsv) == selected

# The original code derives R1-6 columns by synapse-weighted votes for L1/L2/L3 columns.
need = {i for i in retina if roots[i] not in columns}
votes, partners = defaultdict(Counter), defaultdict(list)
for q, root in enumerate(roots):
    if primary.get(root) not in {"L1", "L2", "L3"} or root not in columns:
        continue
    column = columns[root]
    key = (0 if column["hemisphere"] == "left" else 1, int(column["column_id"]))
    for k in range(int(ptr[q]), int(ptr[q + 1])):
        p, weight = int(col[k]), int(syn[k])
        if p in need:
            votes[p][key] += weight
            partners[p].append(dict(rootId=root, primaryType=primary[root], eye=column["hemisphere"],
                columnId=int(column["column_id"]), synapses=weight))
column_lookup = {}
for row in columns.values():
    key = (0 if row["hemisphere"] == "left" else 1, int(row["column_id"]))
    position = ((int(row["q"]) - int(row["p"])) * math.sqrt(3) / 2,
        (int(row["p"]) + int(row["q"])) / 2)
    if key in column_lookup:
        assert column_lookup[key] == position
    column_lookup[key] = position
extents = {}
for eye in [0, 1]:
    xy = [position for key, position in column_lookup.items() if key[0] == eye]
    extents[eye] = min(p[0] for p in xy), max(p[0] for p in xy), min(p[1] for p in xy), max(p[1] for p in xy)

conflicts, direct, indirect, uv_checked = [], 0, 0, 0
for seat, i in enumerate(retina):
    root, kind, eye = roots[i], types[seat], eyes[seat]
    assert primary[root] == kind and kind in {"R1-6", "R7", "R8"}
    classification_row, annotation = classification[root], tsv[root]
    assert classification_row["sub_class"] == "photo_receptor"
    assert classification_row["side"] == ("left" if eye == 0 else "right")
    if root in columns:
        column = columns[root]
        assert column["type"] == kind
        key = (0 if column["hemisphere"] == "left" else 1, int(column["column_id"]))
        method = "direct-column"
        direct += 1
    else:
        assert votes[i], "No placement partner"
        key = min(votes[i], key=lambda key: (-votes[i][key], key))
        method = "lamina-partner-vote"
        indirect += 1
    assert key[0] == eye
    x, y = column_lookup[key]
    xmin, xmax, ymin, ymax = extents[eye]
    xnorm, ynorm = (x - xmin) / (xmax - xmin), (y - ymin) / (ymax - ymin)
    expected_u = xnorm * 0.5 * 0.998 if eye == 0 else 0.5 + (1 - xnorm) * 0.5
    assert np.allclose(uv[seat], [expected_u, ynorm], rtol=0, atol=1e-6), "Stored column geometry differs"
    uv_checked += 1
    annotation_type = annotation["cell_type"] or annotation["hemibrain_type"]
    if annotation_type != kind:
        conflicts.append(dict(rootId=root, graphIndex=i, retinaSeat=seat, retinaType=kind,
            codexPrimaryType=primary[root], codexClassification=classification_row,
            annotation={k: annotation[k] for k in ["cell_type", "hemibrain_type", "cell_class", "cell_sub_class",
                "super_class", "flow", "side", "known_nt", "top_nt", "status"]},
            squareIndex=squares[seat], square="abcdefgh"[squares[seat] % 8] + str(squares[seat] // 8 + 1),
            eye=classification_row["side"], placementMethod=method, columnId=key[1],
            storedUV=uv[seat].tolist(), expectedUV=[expected_u, ynorm],
            directColumn=columns.get(root), placementPartners=partners.get(i, [])))
prior = json.loads(Path("research/reports/neuron-reader-graph-audit-2026-11-01/result.json").read_text())
assert {r["rootId"] for r in conflicts} == {r["rootId"] for r in prior["photos"]["annotationDisagreements"]}
for path, expected in hashes.items():
    assert digest(path) == expected, "Input changed during trace"
assert time.monotonic() - started < 300
active_seconds = time.monotonic() - started
time.sleep(active_seconds)  # One-shot 0.5 duty pacing; no model execution.
result = dict(schema="eyes-retina-identity-trace-v1", date="2026-11-01", inputs=hashes,
    scriptSha256=digest(__file__), selectedInputs=len(retina), graphTypeMatches=len(retina),
    codexPhotoreceptorClassificationMatches=len(retina), sideMatches=len(retina),
    directColumnPlacements=direct, partnerColumnPlacements=indirect, columnGeometryMatches=uv_checked,
    annotationConflicts=conflicts, graphBuiltAt=meta["built_at"], graphSourceMetadata=meta["sources"],
    interpretation="Exact Codex/graph source agreement; v2.1 TSV labels conflict. No independent morphological adjudication.",
    scope="Static numeric arrays/annotations only; no propagation, memory update or changed eye placement",
    cpuDuty=0.5, elapsedSeconds=time.monotonic() - started)
with open(output, "x", encoding="utf-8") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps({key: result[key] for key in ["selectedInputs", "graphTypeMatches",
    "codexPhotoreceptorClassificationMatches", "directColumnPlacements", "partnerColumnPlacements", "columnGeometryMatches"]}
    | {"annotationConflicts": len(conflicts), "output": str(output)}))
