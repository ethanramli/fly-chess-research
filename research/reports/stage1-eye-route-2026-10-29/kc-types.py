"""Map each Kenyon cell graph index in eye-cells.json to its FlyWire consolidated primary_type (by root_id).
Read-only. Writes kc-types.json {kcIdx, type, rootId}, prints type counts.
Usage (repo root): "$USERPROFILE/.venv-class/Scripts/python.exe" -I research/reports/stage1-eye-route-2026-10-29/kc-types.py
"""
import csv, gzip, json
from collections import Counter
import numpy as np

R = "research/reports/stage1-eye-route-2026-10-29/"
z = np.load(".cache/full.npz", mmap_mode="r", allow_pickle=False)
root_ids = np.asarray(z["root_ids"])
kc_idx = json.load(open(R + "eye-cells.json"))["kcIdx"]
kc_root = [int(root_ids[i]) for i in kc_idx]

prim = {}
with gzip.open(".cache/flywire-codex-783-verify/consolidated_cell_types.csv.gz", "rt", newline="") as f:
    for row in csv.DictReader(f):
        prim[int(row["root_id"])] = row["primary_type"]

types = [prim.get(r, "UNMAPPED") for r in kc_root]
json.dump({"kcIdx": kc_idx, "rootId": kc_root, "type": types}, open(R + "kc-types.json", "w"))
print("KCs", len(kc_idx), "unmapped", sum(t == "UNMAPPED" for t in types))
c = Counter(types)
print("KCg-d", c["KCg-d"], "KCab-p", c["KCab-p"], "KCg-m", c["KCg-m"], "KCab", sum(v for k, v in c.items() if k == "KCab"),
      "KCapbp-*", sum(v for k, v in c.items() if k.startswith("KCapbp")))
print(json.dumps(c.most_common(40)))
