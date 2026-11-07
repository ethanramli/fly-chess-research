from pathlib import Path
import hashlib,json
R=Path('research/reports/overnight-eyes-reader-repair-2026-11-01')
old='research/reports/mbon05-sign-conditioning-2026-11-01/pilot.mjs'
s=Path(old).read_text()
s=s.replace(old,str(R/'pilot.mjs').replace('\\','/'))
s=s.replace("const graphSignIdentity = sha(Buffer.from(graph.sign.buffer));", "const graphSignIdentity = sha(Buffer.from(graph.sign.buffer));\nif (a.variant === 'curated' && overlay.edgeSignOverrides.some(e => graph.sign[e.edgeIndex] !== e.proposed)) throw Error('Overlay verification failed');")
s=s.replace('  for (const c of images) naive.set(c, raw(c));', '''  for (const c of images) naive.set(c, raw(c));''')
s=s.replace('  let value = makeReadout(w, images);', '''  let rawLog = null;
  const instrument = world => {
    const forward = world.model.forward.bind(world.model);
    world.model.forward = (...args) => {
      const result = forward(...args);
      if (rawLog) rawLog({ kind: 'raw-response', graphSignIdentity, variant: a.variant,
        stimulation: args[1], cells: neuronReaderCells.cells.map(c => ({ rootId: c.rootId, index: c.index, activity: world.model.h[8][c.index] })),
        dans: COMPARTMENTS.map(([, d]) => ({ type: d, cells: dans.get(d).map(index => ({ index, activity: world.model.h[8][index] })) })) });
      return result;
    };
  };
  instrument(w);
  let value = makeReadout(w, images);''')
s=s.replace("  const log = record => appendFileSync(frameFile, JSON.stringify(record) + '\\n');", "  const log = record => appendFileSync(frameFile, JSON.stringify(record) + '\\n');\n  rawLog = log;")
s=s.replace('    w = makeWorld(seed); const freshValue', '    w = makeWorld(seed); instrument(w); const freshValue')
(R/'pilot.mjs').write_text(s)
a=Path('.codebase/scripts/neural-learning/audit-eye-memory.mjs').read_text()
a=a.replace("      else assert.fail('Unknown receipt kind');", """      else if (['raw-response', 'variant-endpoint'].includes(r.kind)) {
        assert(/^[a-f0-9]{64}$/.test(r.graphSignIdentity));
        assert(['released', 'curated'].includes(r.variant));
        assert.equal(r.cells.length, 14);
        for (const c of [...r.cells, ...(r.dans ?? []).flatMap(g => g.cells)]) assert(Number.isFinite(c.activity) && c.activity >= 0 && c.activity <= 6);
      } else assert.fail('Unknown receipt kind');""")
(R/'audit.mjs').write_text(a)
t=Path('research/reports/mbon05-sign-conditioning-2026-11-01/adapter.test.mjs').read_text().replace(old,str(R/'pilot.mjs').replace('\\','/'))
(R/'adapter.test.mjs').write_text(t)
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
base=json.loads(Path('research/reports/mbon05-sign-conditioning-2026-11-01/protocol.json').read_text())['pins']
for v in ['released','curated']:
 run=f'runs/overnight-eyes-reader-2026-11-01/mbon05-{v}-v1'
 cfg=f'python actions/overnight-mbon05-{v}-v1-step.json'
 pins={p:sha(p) for p in [*base, str(R/'pilot.mjs'),str(R/'audit.mjs'),str(R/'README.md')]}
 argv=['node','--max-old-space-size=256',str(R/'pilot.mjs'),'--out',run,'--seeds','1','--first','4101','--items','2','--delay-steps','400','--cpu-duty','0.5','--variant',v]
 if v=='curated': argv+=['--stimuli','runs/overnight-eyes-reader-2026-11-01/mbon05-released-v1/stimuli.json']
 config={'schema':1,'name':f'overnight-mbon05-{v}-v1','paused':False,'paths':{'run':run,'protocol':'research/reports/mbon05-sign-conditioning-2026-11-01/protocol.json','registration':cfg},'pins':pins,'state_file':f'runs/python-actions/overnight-mbon05-{v}-v1.json','resourceLimits':{'rssMiB':2048,'freeMiB':256},'jobs':{'compare':{'role':'check','argv':argv,'refuse_existing':[run]},'audit':{'role':'check','argv':['node','--max-old-space-size=256',str(R/'audit.mjs'),'--run',run,'--out',run+'/audit.json']}},'artifacts':{'summary':'{run}/summary.json','progress':'{run}/progress.json'},'report_fields':[]}
 Path(cfg).write_text(json.dumps(config,indent=2))
print(json.dumps({'prepared':str(R),'variants':2}))
