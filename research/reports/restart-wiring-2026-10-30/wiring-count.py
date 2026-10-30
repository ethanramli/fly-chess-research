import csv,gzip
from collections import Counter,defaultdict
import numpy as np
z=np.load(".cache/full.npz",mmap_mode="r",allow_pickle=False)
root=np.asarray(z["root_ids"]); ptr=np.asarray(z["csr_indptr"]); col=np.asarray(z["csr_indices"]); syn=np.asarray(z["syn_count"]); sign=np.asarray(z["sign"])
idx={int(r):i for i,r in enumerate(root)}
hb={}; cc={}; side={}
for r in csv.DictReader(open(".cache/flywire-annotations-v2.1.0.tsv",newline="",encoding="utf-8"),delimiter="\t"):
    i=idx.get(int(r["root_id"]))
    if i is not None: hb[i]=r["hemibrain_type"]; cc[i]=r["cell_class"]; side[i]=r["side"]
prim={}
with gzip.open(".cache/flywire-codex-783-verify/consolidated_cell_types.csv.gz","rt",newline="") as f:
    for r in csv.DictReader(f):
        i=idx.get(int(r["root_id"]))
        if i is not None: prim[i]=r["primary_type"]
kc=[i for i,c in cc.items() if c=="Kenyon_Cell"]; kcset=set(kc)
mbon=[i for i,t in hb.items() if t.startswith("MBON")]
dan=[i for i,c in cc.items() if c=="DAN"] or [i for i,t in hb.items() if t.startswith(("PAM","PPL1"))]
print("n kc",len(kc),"mbon",len(mbon),"dan",len(dan),Counter(cc[i] for i in dan))
FOUR=["PAM02","PPL103","PAM11","PPL106"]
print("cells",{t:sum(1 for i in hb if hb[i]==t) for t in FOUR+["MBON12","MBON01","MBON07","MBON14"]})
# orientation check: row=post, col=pre (registered: MBON14 receives KC input)
m14=[i for i in mbon if hb[i]=="MBON14"]
print("MBON14 in-from-KC",sum(int(col[e]) in kcset for p in m14 for e in range(ptr[p],ptr[p+1])))
dset=set(dan); mset=set(mbon)
# direct MBON->DAN edges, per DAN type
tot=defaultdict(lambda:[0,0,0,Counter()])
for d in dan:
    for e in range(ptr[d],ptr[d+1]):
        p=int(col[e])
        if p in mset:
            r=tot[hb[d]]; r[0]+=1; r[1]+=int(syn[e]); r[2]+= int(sign[e]>0); r[3][hb[p]]+=int(syn[e])
print("DAN types with MBON input",len(tot),"of",len(set(hb[d] for d in dan)))
for t in FOUR:
    r=tot[t]; print(t,"edges",r[0],"syn",r[1],"excit",r[2],"top",r[3].most_common(5))
print("all MBON->DAN edges",sum(v[0] for v in tot.values()),"syn",sum(v[1] for v in tot.values()),"excit edges",sum(v[2] for v in tot.values()))
# KC type -> MBON type, for visual KCs
by=defaultdict(Counter)
for m in mbon:
    for e in range(ptr[m],ptr[m+1]):
        p=int(col[e])
        if p in kcset and sign[e]>0: by[prim.get(p,"?")][hb[m]]+=int(syn[e])
for t in ["KCg-d","KCab-p"]:
    tt=sum(by[t].values()); print(t,"syn",tt,[(k,v,round(v/tt,3)) for k,v in by[t].most_common(10)])
# DAN -> MBON-compartment partner proxy: DANs targeting KCg-d axons
dk=defaultdict(Counter)
vis=[i for i in kc if prim.get(i)=="KCg-d"]
for k in vis:
    for e in range(ptr[k],ptr[k+1]):
        p=int(col[e])
        if p in dset: dk["KCg-d"][hb[p]]+=int(syn[e])
print("DAN->KCg-d",dk["KCg-d"].most_common(10))
# Sign and synapse count of same-compartment MBON -> DAN loops and visual-route candidates.
for m,d in [("MBON07","PAM11"),("MBON14","PPL106"),("MBON12","PPL103"),("MBON01","PAM02"),("MBON05","PAM08"),("MBON27","PAM08"),("MBON09","PPL103"),("MBON06","PAM11")]:
    plus=minus=0
    for x in dan:
        if hb[x]!=d: continue
        for e in range(ptr[x],ptr[x+1]):
            p=int(col[e])
            if hb.get(p)==m:
                if sign[e]>0: plus+=int(syn[e])
                else: minus+=int(syn[e])
    print(m,"->",d,"excitatory syn",plus,"inhibitory syn",minus)
print("cells",{t:sum(1 for i in hb if hb[i]==t) for t in ["MBON05","MBON27","MBON09","MBON06","PAM08"]})
