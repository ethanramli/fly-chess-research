// Independent audit of experiment records and local updates. Does not import
// the experiment driver, decoder, plasticity class or gate implementation.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { Chess } from 'chess.js';
const { values: args } = parseArgs({ options: { run: { type: 'string' }, out: { type: 'string' }, replay: { type: 'string' }, prefix: { type: 'string' } } });
if (!args.run || !args.out || existsSync(args.out)) throw Error('Require --run DIR --out NEW_JSON');
const report = JSON.parse(readFileSync(join(args.run, 'report.json'))), p = report.protocol;
const mapping = JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
if (!report.complete) throw Error('Require completed report');
const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b), checks = [];
const check = (name, passed) => checks.push({ name, passed: Boolean(passed) });
const expectedChoice = probe => probe.A.score >= probe.B.score ? 'A' : 'B';
const gfScore = r => Math.max(...r.raw.map((v,i) => Math.min(1,Math.max(0,(v-report.identity.calibration.min[i])/report.identity.calibration.range[i]))));
const frozenCalibration = JSON.parse(readFileSync('research/reports/chess-cue-panel-v1-2026-10-05/report.json'));
check('unchanged label-free calibration', exact(report.identity.calibration,frozenCalibration.calibration) && frozenCalibration.learningApplied===false);
const other = c => c === 'A' ? 'B' : 'A';
const margin = (probe, safe) => probe[safe].score - probe[other(safe)].score;
const old=JSON.parse(readFileSync('research/reports/chess-cue-association-v1-2026-10-05/report.json'));
check('fresh encoder seeds, unchanged conditioning/input/plasticity/kernel settings',p.schema==='mbon-choice-v1'&&p.seeds.length===6&&new Set(p.seeds).size===6&&p.seeds.every(seed=>!old.protocol.seeds.includes(seed))&&
  ['conditions','acquisitionTrials','reversalTrials','fen','actions','taskContext','encoder','current','eta','minGain','maxGain','activityScale','modelSeed','steps','tolerance','alpha'].every(k=>exact(p[k],old.protocol[k]))&&exact(report.identity.model,old.identity.model)&&exact(report.identity.memory,old.identity.memory)&&report.identity.invariant===old.identity.invariant);
check('previous GF failure preserved and shared model/encoder/plasticity source hashes unchanged',old.summary.allGatesPassed===false&&
  ['.codebase/src/lowram/chess-cue.mjs','.codebase/src/lowram/reversal-memory.mjs','.codebase/src/lowram/trainer.mjs'].every(k=>report.identity.sources[k]===old.identity.sources[k]));
check('completed condition/seed coverage', report.results.length === p.seeds.length * p.conditions.length && p.seeds.every(seed => p.conditions.every(condition => report.results.filter(r => r.job.seed === seed && r.job.condition === condition).length === 1)));
for (const [path, hash] of Object.entries(report.identity.inputs)) check(`input: ${path}`, createHash('sha256').update(readFileSync(path)).digest('hex') === hash);
for (const [path, hash] of Object.entries(report.identity.sources)) check(`source: ${path}`, createHash('sha256').update(readFileSync(path)).digest('hex') === hash);
function expectedCues(seed) {
  const pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b),board=new Chess(p.fen);
  const bucket=(token,n)=>createHash('sha256').update(seed+'\0'+token).digest().readUInt32LE(0)%n;
  const fields=board.fen().split(' ');
  return Object.fromEntries(Object.entries(p.actions).map(([key,uci])=>{
    const move=board.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion??'')===uci);
    if(!move)throw Error('Illegal public cue action');
    const tokens=[`turn:${board.turn()}`,`castling:${fields[2]}`,`ep:${fields[3]}`,`halfmove:${fields[4]}`,'repetition:1',
      `task:${p.taskContext.objective}:${p.taskContext.plies}`,`action:${uci}`,`origin:${move.from}`,`destination:${move.to}`,
      `moving:${move.color}:${move.piece}`,`promotion:${move.promotion??'-'}`];
    for(const piece of board.board().flat().filter(Boolean)){const t=`piece:${piece.color}:${piece.type}:${piece.square}`;tokens.push(t,t+'|action:'+uci);}
    tokens.sort();const cells=[...new Set(tokens.map(t=>pool[bucket(t,pool.length)]))];
    cells.sort((a,b)=>bucket('budget:'+a,2**32)-bucket('budget:'+b,2**32)||a-b);
    const selected=cells.slice(0,p.encoder.maxCells).sort((a,b)=>a-b),current=Math.min(p.encoder.maxCellCurrent,p.encoder.totalCurrent/selected.length);
    return [key,selected.map(index=>({index,current}))];
  }));
}
const perSeed = [];
for (const seed of p.seeds) {
  const g = Object.fromEntries(report.results.filter(r => r.job.seed === seed).map(r => [r.job.condition, r]));
  for (const condition of p.conditions) {
    const r = g[condition];
    const expectedPunished = p.seeds.indexOf(seed) % 2 === 0 ? 'A' : 'B';
    check(`${seed}/${condition}: counterbalanced target and identical cue pool`, r.job.initialPunished === expectedPunished && r.job.reversedPunished === other(expectedPunished) && exact(r.cues, g.informative.cues));
    check(`${seed}/${condition}: bounded overlapping public chess cues`, exact(r.cues, expectedCues(seed)) && ['A','B'].every(k => r.cues[k].length > 0 && r.cues[k].length <= p.encoder.maxCells && new Set(r.cues[k].map(s=>s.index)).size === r.cues[k].length && r.cues[k].every(s=>s.current>0&&s.current<=p.encoder.maxCellCurrent)));
    check(`${seed}/${condition}: complete balanced cue/target/pulse schedule`, r.trials.length === p.acquisitionTrials + p.reversalTrials && r.trials.every((t, i) => {
      const acq = i < p.acquisitionTrials, trial = acq ? i : i - p.acquisitionTrials;
      const cue = (seed % 2 ? ['A','B'] : ['B','A'])[trial % 2];
      const punished = acq ? r.job.initialPunished : r.job.reversedPunished;
      return t.cue === cue && t.punished === punished && t.trial === trial && t.phase === (acq ? 'acquisition' : 'reversal') &&
        (condition === 'absent' ? !t.delivered : condition === 'shuffled' ? true : t.delivered === (cue === punished));
    }));
    check(`${seed}/${condition}: fixed MBON balance/margin/choice with separate GF diagnostics`, Object.values(r.probes).every(v => v.choice === expectedChoice(v) && v.M===v.A.score-v.B.score && [v.A,v.B].every(w => {
      const normalized=w.raw.map((a,i)=>(a-report.identity.calibration.min[i])/report.identity.calibration.range[i]);
      const clipped=normalized.map(a=>Math.max(0,Math.min(1,a)));
      return Number.isFinite(w.MBON12)&&Number.isFinite(w.MBON01)&&w.score===w.MBON12-w.MBON01&&w.MBONscore===w.score&&w.raw.length===2&&w.raw.every(Number.isFinite)&&w.GFscore===gfScore(w)&&exact(w.normalized,normalized)&&exact(w.clipped,clipped)&&w.signedScore===Math.max(...normalized)&&exact(w.outsidePanel,normalized.map(a=>a<0||a>1));
    })));
    check(`${seed}/${condition}: reset/restoration`, exact(r.probes.reset, r.probes.baseline) && exact(r.probes.restored, r.probes.reversal));
    check(`${seed}/${condition}: fixed graph and nonplastic parameters`, r.fixedStatePreserved);
    check(`${seed}/${condition}: efficacy bounds`, r.memory.gains.every(v => Number.isFinite(v) && v >= p.minGain && v <= p.maxGain));
    if (condition === 'disabled') check(`${seed}: disabled control unchanged`, r.memory.events === 0 && r.memory.gains.every(v => v === 1) && ['acquisition','reversal'].every(k => exact(r.probes[k], r.probes.baseline)));
    if (condition === 'shuffled') check(`${seed}: phase pulse counts matched`, ['acquisition','reversal'].every(phase => r.trials.filter(t => t.phase === phase && t.delivered).length === g.informative.trials.filter(t => t.phase === phase && t.delivered).length));
    if (condition === 'shuffled') check(`${seed}: independently reconstructed phase permutation`, ['acquisition','reversal'].every((phase, phaseIndex) => {
      const events = g.informative.trials.filter(t => t.phase === phase).map(t => t.delivered);
      let rng = (seed ^ (phaseIndex === 0 ? 0x45c1 : 0x89a3)) >>> 0;
      for (let i = events.length - 1; i > 0; i--) {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        const j = Math.floor(rng / 2 ** 32 * (i + 1)); [events[i], events[j]] = [events[j], events[i]];
      }
      return exact(events, r.trials.filter(t => t.phase === phase).map(t => t.delivered));
    }));
  }
  const r = g.informative, safe = other(r.job.reversedPunished);
  const effect = v => margin(v.probes.reversal, safe) - margin(v.probes.acquisition, safe);
  perSeed.push({ seed, acquisitionCorrect: r.probes.acquisition.choice === other(r.job.initialPunished),
    reversalCorrect: r.probes.reversal.choice === safe,
    acquisitionEffect: margin(r.probes.acquisition, other(r.job.initialPunished)) - margin(r.probes.baseline, other(r.job.initialPunished)),
    acquisitionMargin:margin(r.probes.acquisition,other(r.job.initialPunished)),reversalMargin:margin(r.probes.reversal,safe),
    rankingSwitch:r.probes.acquisition.M*r.probes.reversal.M<0,
    acquisitionAbsentAdvantage:(margin(r.probes.acquisition,other(r.job.initialPunished))-margin(r.probes.baseline,other(r.job.initialPunished)))-(margin(g.absent.probes.acquisition,other(r.job.initialPunished))-margin(g.absent.probes.baseline,other(r.job.initialPunished))),
    acquisitionShuffledAdvantage:(margin(r.probes.acquisition,other(r.job.initialPunished))-margin(r.probes.baseline,other(r.job.initialPunished)))-(margin(g.shuffled.probes.acquisition,other(r.job.initialPunished))-margin(g.shuffled.probes.baseline,other(r.job.initialPunished))),
    reversalEffect: effect(r), absentAdvantage: effect(r) - effect(g.absent), shuffledAdvantage: effect(r) - effect(g.shuffled) });
}
const checkpointNames = readdirSync(args.run).filter(n => /^checkpoint-\d{5}$/.test(n)).sort();
let previous = null, checkedUpdates = 0, updateErrors = [];
for (const name of checkpointNames) {
  const s = JSON.parse(readFileSync(join(args.run, name, 'state.json'))), a = s.active;
  if (a && previous?.active && exact(a.job, previous.active.job) && a.nextTrial === previous.active.nextTrial + 1) {
    const old = previous.active.memory, now = a.memory, local = a.lastLocal, disabled = a.job.condition === 'disabled';
    let offset = 0, expected = [];
    if (disabled) expected = [...old.gains];
    else for (let j = 0; j < local.factors.length; j++) {
      for (let i = 0; i < mapping.groups[j].edges.length; i++, offset++) {
        const gain = old.gains[offset], D = local.factors[j], kc = local.kc[offset];
        expected.push(Math.max(p.minGain, Math.min(p.maxGain, gain + p.eta * D * (kc + gain - 1))));
      }
    }
    const valid = exact(expected, now.gains) && now.events === old.events + (disabled ? 0 : 1) &&
      digest(old) === local.beforeHash && digest(now) === local.afterHash &&
      (disabled || local.factors.length === 4 && local.factors.every(D => Number.isFinite(D) && D <= 0 && -p.eta * D <= 1));
    if (!valid) updateErrors.push(name); checkedUpdates++;
    const A=new Set(a.cues.A.map(s=>s.index)),B=new Set(a.cues.B.map(s=>s.index)),categories={};let cursor=0;
    for(const group of mapping.groups)for(const kc of group.kc){
      const category=A.has(kc)&&B.has(kc)?'shared':A.has(kc)?'A-only':B.has(kc)?'B-only':'neither',key=group.mbonType+'/'+category;
      const row=categories[key]??={count:0,sum:0};row.count++;row.sum+=now.gains[cursor++];
    }
    const expectedCategories=Object.fromEntries(Object.entries(categories).map(([k,v])=>[k,{count:v.count,mean:v.sum/v.count}]));
    check(`${name}: cue-specific efficacy observations`,exact(a.trials.at(-1).cueMemory,expectedCategories));
  }
  previous = s;
}
check('all local update checkpoints audited', checkedUpdates === p.seeds.length * p.conditions.length * (p.acquisitionTrials + p.reversalTrials) && updateErrors.length === 0);
for (const row of perSeed) {
  const published = report.summary.bySeed.find(r => r.seed === row.seed);
  check(`${row.seed}: independent effect/choice calculations`, Object.entries(row).every(([key,value]) => published[key === 'acquisitionCorrect' ? 'acquisitionChoiceCorrect' : key === 'reversalCorrect' ? 'reversalChoiceCorrect' : key] === value));
}
for (const key of ['acquisitionEffect','reversalEffect','acquisitionAbsentAdvantage','acquisitionShuffledAdvantage','absentAdvantage','shuffledAdvantage']) {
  const values = perSeed.map(r => r[key]), n = values.filter(v => Math.abs(v) > p.tolerance).length;
  const positive = values.filter(v => v > p.tolerance).length;
  // Enumerate all fair sign assignments for the six-seed panel, independently
  // of the experiment's binomial-coefficient implementation.
  let count = 0;
  for (let mask = 0; mask < 2 ** n; mask++) { let bits = 0; for (let i = 0; i < n; i++) bits += (mask >>> i) & 1; if (bits >= positive) count++; }
  const expected = n ? count / 2 ** n : 1, observed = report.summary.tests[key];
  check(`independent sign test: ${key}`, observed.p === expected && observed.positive === positive && observed.negative === n - positive && observed.ties === values.length - n);
}
check('acquisition/reversal gate retains every correct-choice requirement',
  report.summary.gates.acquisition === perSeed.every(r => r.acquisitionCorrect && r.acquisitionMargin>0 && r.acquisitionEffect > p.tolerance) &&
  report.summary.gates.reversal === perSeed.every(r => r.reversalCorrect && r.reversalMargin>0 && r.rankingSwitch && r.reversalEffect > p.tolerance));
check('full acceptance matches all reported gates', report.summary.allGatesPassed === Object.values(report.summary.gates).every(Boolean));
const all = report.results;
const disabled = all.filter(r=>r.job.condition==='disabled');
const matched = p.seeds.every(seed=>['acquisition','reversal'].every(phase=>{
  const rows=all.filter(r=>r.job.seed===seed), count=condition=>rows.find(r=>r.job.condition===condition).trials.filter(t=>t.phase===phase&&t.delivered).length;
  return count('informative')===count('shuffled');
}));
const expectedGates={
  acquisition:perSeed.every(r=>r.acquisitionCorrect&&r.acquisitionMargin>0&&r.acquisitionEffect>p.tolerance),
  reversal:perSeed.every(r=>r.reversalCorrect&&r.reversalMargin>0&&r.rankingSwitch&&r.reversalEffect>p.tolerance),
  informative:['acquisitionAbsentAdvantage','acquisitionShuffledAdvantage','absentAdvantage','shuffledAdvantage'].every(k=>report.summary.tests[k].p<p.alpha),
  persistence:all.filter(r=>r.job.condition==='informative').every(r=>exact(r.probes.acquisition,r.probes.persistence)&&exact(r.probes.reversal,r.probes.restored)),
  causalReset:all.every(r=>exact(r.probes.reset,r.probes.baseline)),
  controls:disabled.every(r=>r.memory.events===0&&r.memory.gains.every(v=>v===1)&&['acquisition','reversal'].every(k=>exact(r.probes[k],r.probes.baseline)))&&matched,
  fixedState:all.every(r=>r.fixedStatePreserved)
};
check('all seven frozen gates independently recomputed', exact(expectedGates,report.summary.gates));
let replay = null;
if (args.replay) {
  const b = JSON.parse(readFileSync(join(args.replay, 'report.json')));
  replay = b.complete && exact(report.results, b.results) && exact(report.summary, b.summary) && exact(report.identity, b.identity);
  check('exact completed scientific replay', replay);
}
const result = { allChecksPassed: checks.every(c => c.passed), checks, perSeed, checkedUpdates, updateErrors, replay,
  sourceSHA256: createHash('sha256').update(readFileSync('.codebase/scripts/audit-mbon-choice.mjs')).digest('hex'),
  reportSHA256: createHash('sha256').update(readFileSync(join(args.run, 'report.json'))).digest('hex'),
  originalAcceptance: report.summary.gates, originalAllGatesPassed: report.summary.allGatesPassed,
  scope: 'Public cue projection, fixed MBON arithmetic, GF diagnostics and local-update recurrence; experimental contingencies, not biological action validation or verified chess outcomes.' };
if(args.prefix){
  const sourceStates=checkpointNames.map(name=>JSON.parse(readFileSync(join(args.run,name,'state.json'))));
  const states=readdirSync(args.prefix).filter(n=>/^checkpoint-\d{5}$/.test(n)).sort().map(name=>JSON.parse(readFileSync(join(args.prefix,name,'state.json'))));
  const scientific=s=>({identity:s.identity,nextJob:s.nextJob,active:s.active,results:s.results});
  result.prefixChecks=states.map(s=>({nextJob:s.nextJob,trial:s.active?.nextTrial??null,matched:sourceStates.some(v=>exact(scientific(s),scientific(v)))}));
  result.prefixReplayExact=states.length>=2&&result.prefixChecks.every(v=>v.matched);
  result.allChecksPassed&&=result.prefixReplayExact;
}
writeFileSync(args.out, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ allChecksPassed: result.allChecksPassed, checkedUpdates, updateErrors, perSeed, replay }));
if (!result.allChecksPassed) process.exitCode = 2;
