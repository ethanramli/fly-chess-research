"""Eye route, step 0 (wiring only; no simulation, no learning). For the pinned graph .cache/full.npz:
which Kenyon cells (FlyWire classification class Kenyon_Cell) are reachable from the 5,543 retina
photoreceptors along synaptic paths, how many hops it takes, and whether paths are excitatory-only
(every edge sign +1). The model propagates for 8 steps (one synapse per step), so only KCs within
8 hops can respond. Writes eye-cells.json (photoreceptor and KC graph indices) and prints a summary.
Usage (repo root): python -I research/reports/stage1-eye-route-2026-10-29/eye-paths.py
"""
import csv, gzip, json
import numpy as np
z = np.load(".cache/full.npz", allow_pickle=False)
rid, indptr, pre, sign = z["root_ids"], z["csr_indptr"], z["csr_indices"], z["sign"]
n = rid.size
post_of_edge = np.repeat(np.arange(n), np.diff(indptr))          # CSR rows are postsynaptic
order = np.argsort(pre, kind="stable")                             # forward adjacency: pre -> post
f_ptr = np.concatenate([[0], np.cumsum(np.bincount(pre, minlength=n))])
f_post, f_sign = post_of_edge[order], sign[order]
kc_ids = {int(r["root_id"]) for r in csv.DictReader(gzip.open(".cache/flywire-codex-783-verify/classification.csv.gz", "rt")) if r["class"] == "Kenyon_Cell"}
is_kc = np.isin(rid, np.fromiter(kc_ids, np.int64)); kcs = np.flatnonzero(is_kc)
ret = z["retina_idx"].astype(np.int64)
def bfs(excitatory_only):
    dist = np.full(n, -1, np.int64); dist[ret] = 0; frontier = ret
    for d in range(1, 13):
        nxt = []
        for u in frontier:
            s, e = f_ptr[u], f_ptr[u + 1]; v = f_post[s:e]
            if excitatory_only: v = v[f_sign[s:e] > 0]
            v = v[dist[v] < 0]; dist[v] = d; nxt.append(v)
        frontier = np.unique(np.concatenate(nxt)) if nxt else np.array([], np.int64)
        if not frontier.size: break
    return dist
out = {"photoreceptors": int(ret.size), "kenyonCells": int(kcs.size)}
for label, exc in (("anySign", False), ("excitatoryOnly", True)):
    dist = bfs(exc); kd = dist[kcs]
    out[label] = {"kcReachableWithin8": int(np.sum((kd > 0) & (kd <= 8))),
                  "kcByHops": {int(h): int(c) for h, c in zip(*np.unique(kd[kd > 0], return_counts=True))},
                  "kcUnreachedWithin12": int(np.sum(kd < 0))}
json.dump({"retinaIdx": ret.tolist(), "retinaSquare": z["retina_square"].astype(int).tolist(),
           "kcIdx": kcs.tolist()}, open("research/reports/stage1-eye-route-2026-10-29/eye-cells.json", "w"))
print(json.dumps(out, indent=1))

# Learner pools: the KCs our registered encoder drives (mapping.json groups by MBON compartment).
mp = json.load(open("research/reports/reversal-candidate-2026-10-05/mapping.json"))["mapping"]
dist_any, dist_exc = bfs(False), bfs(True)
pools = {}
for g in mp["groups"]:
    pools.setdefault(g["mbonType"], set()).update(g["kc"])
for t, cells in sorted(pools.items()):
    c = np.fromiter(cells, np.int64)
    pools_out = {"cells": int(c.size), "allAreKCs": bool(is_kc[c].all()),
                 "hopsAny": {int(h): int(k) for h, k in zip(*np.unique(dist_any[c], return_counts=True))},
                 "hopsExcitatory": {int(h): int(k) for h, k in zip(*np.unique(dist_exc[c], return_counts=True))}}
    print(t, json.dumps(pools_out))
