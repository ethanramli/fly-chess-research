import { createHash } from 'node:crypto';
import { createRelationalChessCueEncoder } from './relational-chess-cue-v2.mjs';

// Experimental feature/projection comparison, not a natural visual pathway.
// Preserves the existing encoder and all mapped wiring. No consequence labels.
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bucket = (seed, token, n) => createHash('sha256').update(`${seed}\0${token}`).digest().readUInt32LE(0) % n;
export function createCompartmentChessCueEncoder(mapping, {
  seed = 14009, maxCells = 14, totalCurrent = 21, maxCellCurrent = 1.5,
  maxHistoryPlies = 512, conjoin = false, stratify = false,
} = {}) {
  if (typeof conjoin !== 'boolean' || typeof stratify !== 'boolean'
    || maxCells % 2 !== 0 || maxCells < 2) throw Error('Require boolean factors and even bounded cell budget');
  const config = Object.freeze({seed,maxCells,totalCurrent,maxCellCurrent,maxHistoryPlies,conjoin,stratify});
  const original = createRelationalChessCueEncoder(mapping, {seed,maxCells,totalCurrent,maxCellCurrent,maxHistoryPlies});
  const pools = Object.fromEntries(['PAM02','PPL103'].map(type => [type,
    [...new Set(mapping.groups.filter(g => g.danType === type).flatMap(g => g.kc))].sort((a,b) => a-b)]));
  if (stratify && Object.values(pools).some(pool => pool.length < maxCells / 2)) throw Error('Insufficient eligible compartment pool');
  const identity = digest({schema:'compartment-chess-cue-v1',mapping,config,pools,original:original.identity});
  function encode(board,candidate,task) {
    const base = original.encode(board,candidate,task);
    const action = base.tokens.find(t => t.startsWith('action:'));
    if (!action) throw Error('Missing public candidate action');
    const tokens = conjoin ? base.tokens.map(token => `joint:${JSON.stringify([action,token])}`).sort() : base.tokens;
    const assignments = [], selected = [], quota = maxCells / 2;
    if (!conjoin && !stratify) {
      return {...base,schema:'compartment-chess-cue-v1',identity,baseIdentity:original.identity,
        projection:{conjoin,stratify,pools:Object.fromEntries(Object.entries(pools).map(([type,pool]) => [type,pool.length]))}};
    }
    const groups = stratify ? ['PAM02','PPL103'] : ['pooled'];
    for (const group of groups) {
      const pool = group === 'pooled' ? original.pool : pools[group];
      const assigned = tokens.map(token => ({token,group,index:pool[bucket(seed,
        group === 'pooled' ? token : `${group}:${token}`,pool.length)]}));
      assignments.push(...assigned);
      const unique = [...new Set(assigned.map(row => row.index))];
      unique.sort((a,b) => bucket(seed,`budget:${a}`,2**32)-bucket(seed,`budget:${b}`,2**32)||a-b);
      const available = unique.filter(index => !selected.includes(index));
      const count = stratify ? quota : maxCells;
      if (available.length < count) throw Error('Feature projection cannot meet fixed dose without arbitrary padding');
      selected.push(...available.slice(0,count));
    }
    selected.sort((a,b) => a-b);
    const selectedSet = new Set(selected), amplitude = Math.min(maxCellCurrent,totalCurrent/selected.length);
    const coverage = Object.fromEntries(Object.entries(pools).map(([type,pool]) =>
      [type,selected.filter(index => pool.includes(index)).length]));
    return {...base,schema:'compartment-chess-cue-v1',identity,baseIdentity:original.identity,tokens,assignments,
      stimulation:selected.map(index => ({index,current:amplitude})),
      accounting:{featureCount:tokens.length,assignments:assignments.length,stimulatedCells:selected.length,
        collisions:assignments.length-new Set(assignments.map(row=>row.index)).size,
        droppedFeatures:assignments.filter(row=>!selectedSet.has(row.index)).length,
        totalCurrent:amplitude*selected.length,currentPerCell:amplitude,poolCells:original.pool.length},
      projection:{conjoin,stratify,quota:stratify?quota:null,coverage,
        selectionOrder:groups,pools:Object.fromEntries(Object.entries(pools).map(([type,pool])=>[type,pool.length])),
        meaning:'Eligible pools may overlap; quotas designate selection origin, not independent anatomical compartments'},
      interface:'Unfitted candidate-conjunction/eligible-pool projection comparison; no outcomes, whole-position IDs or natural vision'};
  }
  return Object.freeze({schema:'compartment-chess-cue-v1',identity,config,pools,encode});
}
