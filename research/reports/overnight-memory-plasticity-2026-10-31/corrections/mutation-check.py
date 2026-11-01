# Breaks temp copies of the candidate core one way at a time and confirms the tests go red. Repo files are never touched.
import json,os,shutil,subprocess,sys,tempfile,pathlib
root=pathlib.Path(".").resolve()
core=".codebase/src/neural-learning/local-gated-memory.mjs"
run=".codebase/src/neural-learning/memory-assay-run.mjs"
checker=".codebase/src/neural-learning/memory-assay-checker.mjs"
tests=[".codebase/tests/neural-learning/local-gated-memory.test.mjs",".codebase/tests/neural-learning/memory-assay-local-gated.test.mjs",".codebase/tests/neural-learning/memory-assay-run.test.mjs",".codebase/tests/neural-learning/memory-assay-certificate.test.mjs"]
MUTANTS=[
 ("no eligibility threshold",core,"(k - theta) / (1 - theta)","k + 0.5"),
 ("eligibility ignored in rate",core,"rate = nextTrace * (a + b)","rate = (a + b)"),
 ("restoration direction flipped",core,"(a * minGain + b * maxGain)","(a * maxGain + b * minGain)"),
 ("trace never decays",core,"Math.exp(-dt / tauE)","1"),
 ("restore skips trace bounds",core,"s.traces.every(v => Number.isFinite(v) && v >= 0 && v <= 1)","true"),
 ("snapshot drops traces",core,"gains: [...this.gains], traces: [...this.traces]","gains: [...this.gains], traces: new Array(this.traces.length).fill(0)"),
 ("unknown still pulses",run,"else if (!unknown && arm !== 'absent')","else if (arm !== 'absent')"),
 ("disabled arm learns",run,"learns = arm !== 'disabled'","learns = true"),
 ("checker ignores consequence",checker,"return cert.consequence === expected ? { ok: true } : fail('consequence');","return { ok: true };"),
]
out=[]
for name,file,a,b in MUTANTS:
    with tempfile.TemporaryDirectory() as t:
        t=pathlib.Path(t)
        shutil.copytree(root/".codebase/src",t/".codebase/src")
        shutil.copytree(root/".codebase/tests/neural-learning",t/".codebase/tests/neural-learning")
        if (root/"node_modules").exists() and not (t/"node_modules").exists():
            os.symlink(root/"node_modules",t/"node_modules",target_is_directory=True) if os.name!="nt" else subprocess.run(["cmd","/c","mklink","/J",str(t/"node_modules"),str(root/"node_modules")],capture_output=True)
        p=t/file; s=p.read_text(encoding="utf-8")
        if a not in s: out.append({"mutant":name,"applied":False}); continue
        p.write_text(s.replace(a,b),encoding="utf-8")
        r=subprocess.run(["node","--max-old-space-size=256","--test"]+tests,cwd=t,capture_output=True,text=True,timeout=300)
        fail=[l for l in r.stdout.splitlines() if l.startswith("# fail")]
        n=int(fail[0].split()[-1]) if fail else None
        out.append({"mutant":name,"applied":True,"failingTests":n,"caught":bool(n)})
        if os.name=="nt" and (t/"node_modules").exists(): os.rmdir(t/"node_modules")
print(json.dumps({"allCaught":all(o.get("caught") for o in out),"mutants":out},indent=1))
