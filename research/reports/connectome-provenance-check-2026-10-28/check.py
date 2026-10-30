"""Independent provenance check of .cache/full.npz against the official FlyWire Codex 783 tables.

Researcher question 2026-10-28: is the graph the original FlyWire connectome or something trained?
This reimplements the documented conversion rules from scratch (numpy and the standard library only;
none of cesp99's code is imported) and compares field by field:
  neurons:  every root_id is a FlyWire 783 neuron; super_class matches classification.csv;
  edges:    synapses summed per (pre, post) over neuropils, kept if >= 5 and pre != post; the edge set
            and every syn_count must equal full.npz;
  signs:    per-neuron transmitter = neurons.csv nt_type, else the syn-weighted majority of the
            connection-level nt_type (largest-row label per pair); sign = -1 for GABA/GLUT, else +1;
  retina:   R7/R8 photoreceptors have that primary type and lie in the eye named by retina_eye;
            photoreceptors of one ommatidial column share one board square.
Usage (repo root): python -I research/reports/connectome-provenance-check-2026-10-28/check.py \
                   .cache/flywire-codex-783-verify .cache/full.npz
"""
import csv, gzip, json, sys
from array import array
from collections import defaultdict
import numpy as np

tables, npz_path = sys.argv[1], sys.argv[2]
z = np.load(npz_path, allow_pickle=False)
rid = z["root_ids"]; n = rid.size
order = np.argsort(rid); sorted_rid = rid[order]
def index_of(ids):
    pos = np.searchsorted(sorted_rid, ids); pos[pos >= n] = 0
    hit = sorted_rid[pos] == ids
    return np.where(hit, order[pos], -1)
rows = lambda name: csv.DictReader(gzip.open(f"{tables}/{name}", "rt", newline=""))
report = {}

# Neurons and classes.
cls = {int(r["root_id"]): r["super_class"] for r in rows("classification.csv.gz")}
nt_neuron = {int(r["root_id"]): r["nt_type"] for r in rows("neurons.csv.gz")}
report["npzNeurons"] = int(n); report["flywireNeurons"] = len(nt_neuron)
report["npzRootIdsInFlyWire"] = int(sum(int(x) in nt_neuron for x in rid))
sc = z["super_class"]
report["superClassMatches"] = int(sum(cls.get(int(x), "") == str(s) for x, s in zip(rid, sc)))

# Connections: aggregate over neuropils.
pre, post, syn, ntid = array("q"), array("q"), array("q"), array("b")
NT = ["", "ACH", "GABA", "GLUT", "DA", "SER", "OCT"]; ntcode = {k: i for i, k in enumerate(NT)}
for r in rows("connections.csv.gz"):
    pre.append(int(r["pre_root_id"])); post.append(int(r["post_root_id"]))
    syn.append(int(r["syn_count"])); ntid.append(ntcode.get(r["nt_type"], 0))
pre, post, syn, ntid = (np.frombuffer(a, dtype=t).copy() for a, t in ((pre, np.int64), (post, np.int64), (syn, np.int64), (ntid, np.int8)))
report["connectionRows"] = int(pre.size)
all_ids = np.unique(np.concatenate([pre, post])); P = np.searchsorted(all_ids, pre); Q = np.searchsorted(all_ids, post)
key = P * all_ids.size + Q
uk, inv = np.unique(key, return_inverse=True)
total = np.bincount(inv, weights=syn).astype(np.int64)
# Label per pair: the row with the largest syn_count (ties: first row in file order after a stable sort).
o = np.lexsort((-syn, inv)); first = np.ones(o.size, bool); first[1:] = inv[o][1:] != inv[o][:-1]
pair_nt = np.empty(uk.size, np.int8); pair_nt[inv[o][first]] = ntid[o][first]
pp, qq = uk // all_ids.size, uk % all_ids.size
pre_id, post_id = all_ids[pp], all_ids[qq]
report["aggregatedPairs"] = int(uk.size)

# Per-neuron transmitter: neurons.csv label, else syn-weighted majority over its outgoing pairs.
weights = np.zeros((all_ids.size, len(NT)))
np.add.at(weights, (pp, pair_nt.astype(np.int64)), total)
def neuron_nt(r):
    lab = nt_neuron.get(r, "")
    if lab: return lab
    k = np.searchsorted(all_ids, r)
    if k < all_ids.size and all_ids[k] == r and weights[k].sum(): return NT[int(np.argmax(weights[k]))]
    return ""
npz_nt = z["nt_type"].astype(str)
report["ntTypeMatches"] = int(sum(neuron_nt(int(x)) == y for x, y in zip(rid, npz_nt)))
mism = [(i, neuron_nt(int(x)), y) for i, (x, y) in enumerate(zip(rid, npz_nt)) if neuron_nt(int(x)) != y]
outdeg = np.bincount(z["csr_indices"], minlength=n)
report["ntTypeMismatches"] = [{"rootId": str(rid[i]), "npz": y, "rule": m, "outgoingEdges": int(outdeg[i]),
  "signDiffers": (y in ("GABA", "GLUT")) != (m in ("GABA", "GLUT"))} for i, m, y in mism]

# Expected edge set among npz neurons.
keep = (total >= 5) & (pre_id != post_id)
ip, iq = index_of(pre_id[keep]), index_of(post_id[keep]); inside = (ip >= 0) & (iq >= 0)
report["pairsWithAtLeast5"] = int(keep.sum()); report["pairsWithAtLeast5BothInNpz"] = int(inside.sum())
exp_key = iq[inside].astype(np.int64) * n + ip[inside]; exp_syn = total[keep][inside]   # rows = post, cols = pre
indptr, indices, sc_npz, sign = z["csr_indptr"], z["csr_indices"], z["syn_count"], z["sign"]
rows_of = np.repeat(np.arange(n, dtype=np.int64), np.diff(indptr))
got_key = rows_of * n + indices
eo = np.argsort(exp_key); exp_key, exp_syn = exp_key[eo], exp_syn[eo]
pos = np.clip(np.searchsorted(exp_key, got_key), 0, exp_key.size - 1); found = exp_key[pos] == got_key
report["npzEdges"] = int(indices.size)
report["npzEdgesInExpected"] = int(found.sum())
report["expectedEdgesInNpz"] = int(np.isin(exp_key, got_key).sum())
report["expectedEdges"] = int(exp_key.size)
report["synCountMatches"] = int((found & (exp_syn[pos] == sc_npz.astype(np.int64))).sum())
neg = {"GABA", "GLUT"}
pre_nt = npz_nt[indices]
report["signMatchesNtRule"] = int(np.sum(np.where(np.isin(pre_nt, list(neg)), -1, 1) == sign))
kept_neurons = set(pre_id[keep].tolist()) | set(post_id[keep].tolist())
report["neuronsWithKeptEdge"] = len(kept_neurons)
report["neuronsWithKeptEdgeNotInNpz"] = len(kept_neurons - set(rid.tolist()))

# Retina.
ptype = {int(r["root_id"]): r["primary_type"] for r in rows("consolidated_cell_types.csv.gz")}
col = {int(r["root_id"]): (r["hemisphere"], r["column_id"]) for r in rows("column_assignment.csv.gz")}
ri, rsq, rtype, reye = z["retina_idx"], z["retina_square"], z["retina_type"].astype(str), z["retina_eye"]
r_ids = rid[ri]
report["retinaPhotoreceptors"] = int(ri.size)
report["retinaTypeMatches"] = int(sum(ptype.get(int(x), "") == t for x, t in zip(r_ids, rtype)))
r78 = [(int(x), int(e), int(s)) for x, t, e, s in zip(r_ids, rtype, reye, rsq) if t in ("R7", "R8")]
report["retinaR7R8"] = len(r78)
report["retinaR7R8WithColumn"] = sum(x in col for x, _, _ in r78)
eyes = defaultdict(set)
for x, e, s in r78:
    if x in col: eyes[col[x][0]].add(e)
report["retinaEyeCodeByHemisphere"] = {h: sorted(v) for h, v in eyes.items()}
squares = defaultdict(set)
for x, e, s in r78:
    if x in col: squares[col[x]].add(s)
report["retinaColumnsOneSquare"] = sum(len(v) == 1 for v in squares.values()); report["retinaColumns"] = len(squares)
print(json.dumps(report, indent=1))
