# Static read-only count: visual KC -> MBON -> DAN routes. No simulation.
# Compartment names are NOT in the graph; they come from the Li et al. 2020 type names (see visual-pathway.md).
import csv,gzip,hashlib,json
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
kc=[i for i,c in cc.items() if c=="Kenyon_Cell"]
mbon=[i for i,t in hb.items() if t.startswith("MBON")]
dan=[i for i,c in cc.items() if c=="DAN"]
inc=lambda i:range(ptr[i],ptr[i+1])  # row=post, col=pre
vis={"KCg-d":[i for i in kc if prim.get(i)=="KCg-d"],"KCab-p":[i for i in kc if prim.get(i)=="KCab-p"]}
out={"counts":{k:len(v) for k,v in vis.items()},"sha256_full_npz":hashlib.sha256(open(".cache/full.npz","rb").read()).hexdigest()}
kcsets={k:set(v) for k,v in vis.items()}
# KC->MBON with sign
for t,s in kcsets.items():
    c=Counter();neg=Counter()
    for m in mbon:
        for e in inc(m):
            if int(col[e]) in s:
                (c if sign[e]>0 else neg)[hb[m]]+=int(syn[e])
    tt=sum(c.values())+sum(neg.values())
    out[f"{t}->MBON"]=[(k,v,round(v/tt,3)) for k,v in c.most_common(12)]; out[f"{t}->MBON_negative"]=neg.most_common(5)
# DAN->KC (DAN output onto visual KC axons), and all DAN types
for t,s in kcsets.items():
    c=Counter();neg=Counter()
    for k in s:
        for e in inc(k):
            p=int(col[e])
            if cc.get(p)=="DAN": (c if sign[e]>0 else neg)[hb[p]]+=int(syn[e])
    out[f"DAN->{t}"]=c.most_common(16); out[f"DAN->{t}_negative"]=neg.most_common(16)
# DAN->MBON direct, same type-name compartment partners
pairs=[("PPL103","MBON32"),("PPL103","MBON35"),("PPL103","MBON12"),("PAM08","MBON05"),("PAM07","MBON05"),("PAM01","MBON27"),("PAM12","MBON09"),("PPL106","MBON14"),("PAM11","MBON07"),("PAM09","MBON06"),("PAM10","MBON06"),("PPL102","MBON11")]
cells=lambda t:[i for i,h in hb.items() if h==t]
rows=[]
for d,m in pairs:
    ds=set(cells(d)); dm=mk=md=0; mdp=mdn=0
    for x in cells(m):
        for e in inc(x):
            if int(col[e]) in ds: dm+=int(syn[e])
    for x in ds:
        for e in inc(x):
            if hb.get(int(col[e]))==m:
                if sign[e]>0: mdp+=int(syn[e])
                else: mdn+=int(syn[e])
    rows.append(dict(dan=d,mbon=m,n_dan=len(ds),n_mbon=len(cells(m)),dan_to_mbon_syn=dm,mbon_to_dan_excit=mdp,mbon_to_dan_inhib=mdn))
out["same_name_pairs"]=rows
# Direct reward-DAN <-> punish-DAN edges, and two-step PAM->X->PPL inhibition candidates
pam=[i for i in dan if hb[i].startswith("PAM")]; ppl=[i for i in dan if hb[i].startswith("PPL1")]
pams=set(pam);ppls=set(ppl)
d=Counter()
for p in ppl:
    for e in inc(p):
        if int(col[e]) in pams: d[(hb[int(col[e])],hb[p],"+" if sign[e]>0 else "-")]+=int(syn[e])
out["PAM->PPL_direct"]=[("%s>%s %s"%k,v) for k,v in d.most_common(12)]
d=Counter()
for p in pam:
    for e in inc(p):
        if int(col[e]) in ppls: d[(hb[int(col[e])],hb[p],"+" if sign[e]>0 else "-")]+=int(syn[e])
out["PPL->PAM_direct"]=[("%s>%s %s"%k,v) for k,v in d.most_common(12)]
# Inputs to the two visual-route PPL types, by presynaptic class and sign
for t in ["PPL103","PPL106","PAM08","PAM11"]:
    pos=Counter();neg=Counter()
    for x in cells(t):
        for e in inc(x):
            p=int(col[e]); lab=hb.get(p) or prim.get(p) or "?"
            if (lab or "").startswith(("MBON","PAM","PPL1")) or cc.get(p) in ("DAN",):
                (pos if sign[e]>0 else neg)[lab]+=int(syn[e])
    out[f"{t}_MB_inputs_excit"]=pos.most_common(6); out[f"{t}_MB_inputs_inhib"]=neg.most_common(6)
# MBON->PPL inhibitory route from PAM-written MBONs on the eye route
for t,s in kcsets.items():
    within=across=neg=0; partners=[]
    other=set(kc)-s
    for k in s:
        n=0
        for e in inc(k):
            p=int(col[e])
            if p in s:
                within+=int(syn[e]); n+=1
                if sign[e]<=0: neg+=int(syn[e])
            elif p in other: across+=int(syn[e])
        partners.append(n)
    out[f"{t}_KC_to_KC"]=dict(within_syn=within,from_other_KC_syn=across,within_negative_syn=neg,mean_presyn_partners=round(float(np.mean(partners)),1))
json.dump(out,open("research/reports/overnight-memory-plasticity-2026-10-31/anatomy/visual-route-output.json","w"),indent=1,default=str)
print(json.dumps(out,indent=0,default=str))
