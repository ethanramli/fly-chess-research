import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Chess} from 'chess.js';
// Independent projection arithmetic copied from the independent association auditor.
// No encoder, neural dynamics, decoder or learning implementation imports.
const {values:args}=parseArgs({options:{run:{type:'string'},out:{type:'string'}}});
if(!args.run||!args.out)throw Error('Require --run and fresh --out');
const hash=value=>createHash('sha256').update(value).digest('hex');
const reportBytes=readFileSync(join(args.run,'report.json')),r=JSON.parse(reportBytes);
assert.equal(r.passed,true);
for(const [path,expected] of Object.entries({...r.inputs,...r.sources}))assert.equal(hash(readFileSync(path)),expected);
const p=JSON.parse(readFileSync('research/data/compartment-input-association-v1/protocol.json'));
const mapping=JSON.parse(readFileSync('research/reports/reversal-candidate-2026-10-05/mapping.json')).mapping;
const board=new Chess(p.fen),pool=[...new Set(mapping.groups.flatMap(g=>g.kc))].sort((a,b)=>a-b);
let variant;
function projectedCue(seed, candidate) {
  const move = board.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion ?? '') === candidate);
  assert.ok(move); assert.equal(board.history().length, 0);
  const [,, castling, ep, halfmove] = board.fen().split(' ');
  const xy = square => [square.charCodeAt(0)-97,Number(square[1])-1];
  const [fx,fy] = xy(move.from), [tx,ty] = xy(move.to), direction = board.turn() === 'w' ? 1 : -1;
  const relativeRights = board.turn() === 'w' ? castling : castling.replace(/[KQkq]/g,c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
  const rights = castling === '-' ? '-' : 'KQkq'.split('').filter(c => relativeRights.includes(c)).join('');
  const inventory = mirror => {
    const action = `${move.piece}:${mirror*(tx-fx)},${direction*(ty-fy)}:${move.promotion??'-'}`;
    const values = [`action:${action}`,`capture:${move.captured??'-'}`,`castle:${rights}`,
      `halfmove:${halfmove}`,'repetition:1',`task:${p.taskContext.objective}:${p.taskContext.plies}`];
    for (const [label,sx,sy] of [['origin',fx,fy],['target',tx,ty]]) {
      const x = mirror === 1 ? sx : 7-sx, y = direction === 1 ? sy : 7-sy;
      values.push(`${label}-walls:${x},${7-x},${y},${7-y}`);
    }
    if (ep === '-') values.push('ep:-'); else { const [ex,ey]=xy(ep); values.push(`ep-from-target:${mirror*(ex-tx)},${direction*(ey-ty)}`); }
    for (const piece of board.board().flat().filter(Boolean)) {
      const [px,py]=xy(piece.square), role=piece.color===board.turn()?'self':'opponent';
      values.push(`around-target:${move.piece}:${role}:${piece.type}:${mirror*(px-tx)},${direction*(py-ty)}`);
      values.push(`around-origin:${action}:${role}:${piece.type}:${mirror*(px-fx)},${direction*(py-fy)}`);
    }
    return values.sort();
  };
  let tokens = inventory(1); const reflected = castling === '-' ? inventory(-1) : null;
  if (reflected && JSON.stringify(reflected)<JSON.stringify(tokens)) tokens=reflected;
  if (variant.conjoin) { const action=tokens.find(t=>t.startsWith('action:')); tokens=tokens.map(token=>`joint:${JSON.stringify([action,token])}`).sort(); }
  const bucket = (token, size) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % size;
  const selected=[];
  for (const group of variant.stratify ? ['PAM02','PPL103'] : ['pooled']) {
    const eligible = group === 'pooled' ? pool : [...new Set(mapping.groups.filter(g=>g.danType===group).flatMap(g=>g.kc))].sort((a,b)=>a-b);
    const cells=[...new Set(tokens.map(token=>eligible[bucket(group==='pooled'?token:`${group}:${token}`,eligible.length)]))];
    cells.sort((a,b)=>bucket(`budget:${a}`,2**32)-bucket(`budget:${b}`,2**32)||a-b);
    selected.push(...cells.filter(cell=>!selected.includes(cell)).slice(0,variant.stratify?7:14));
  }
  selected.sort((a,b)=>a-b); assert.equal(selected.length,14);
  return selected.map(index => ({ index, current: Math.min(p.encoder.maxCellCurrent, p.encoder.totalCurrent / selected.length) }));
}
const expected=p.variants.flatMap(v=>p.seeds.flatMap(seed=>Object.keys(p.actions).map(action=>({variant:v.id,seed,action}))));
assert.deepEqual(r.rows.map(({variant,seed,action})=>({variant,seed,action})),expected);
const summaries=[];
for(const v of p.variants){variant=v;
  for(const seed of p.seeds){const rows=r.rows.filter(row=>row.variant===v.id&&row.seed===seed);
    for(const row of rows){assert.deepEqual(row.cue.stimulation,projectedCue(seed,p.actions[row.action]));
      assert.equal(row.cue.move,p.actions[row.action]);assert.equal(row.cue.fen,p.fen);
      assert.equal(row.cue.accounting.totalCurrent,21);}
    const sets=rows.map(row=>new Set(row.cue.stimulation.map(c=>c.index)));
    const shared=[...sets[0]].filter(index=>sets[1].has(index)).length;
    const coverage=rows.map(row=>Object.fromEntries(['PAM02','PPL103'].map(type=>{const eligible=new Set(mapping.groups.filter(g=>g.danType===type).flatMap(g=>g.kc));return [type,row.cue.stimulation.filter(cell=>eligible.has(cell.index)).length];})));
    summaries.push({variant:v.id,seed,cueOverlap:shared,jaccard:shared/(28-shared),coverage});
  }
}
writeFileSync(args.out,JSON.stringify({passed:true,cuesChecked:r.rows.length,reportSha256:hash(reportBytes),
  auditSha256:hash(readFileSync('.codebase/scripts/audit-compartment-preflight.mjs')),summaries,
  scope:'Independent public-geometry projection/dose/overlap checks only; stimulation overlap is not neural discrimination, learning or transfer'},null,2),{flag:'wx'});
console.log(JSON.stringify({passed:true,cues:r.rows.length,pairs:summaries.length}));