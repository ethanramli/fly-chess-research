// Experimental engine target, not a proof or a biological reward model.
export function parseStockfishInfo(line) {
  if (!line.startsWith('info depth ')) return null;
  const score = line.match(/\bscore (cp|mate) (-?\d+)\b/);
  const wdl = line.match(/\bwdl (\d+) (\d+) (\d+)\b/);
  const depth = line.match(/\bdepth (\d+)\b/), nodes = line.match(/\bnodes (\d+)\b/);
  const pv = line.match(/\bpv (.+)$/);
  if (!score || !wdl || !depth || !nodes || !pv) return null;
  const values = wdl.slice(1).map(Number);
  if (values.some(v => v < 0 || v > 1000) || values.reduce((a,b)=>a+b,0) !== 1000) return null;
  return { kind: score[1], score: Number(score[2]), wdl: values,
    depth: Number(depth[1]), nodes: Number(nodes[1]), pv: pv[1].trim().split(/\s+/),
    bounded: /\b(lowerbound|upperbound)\b/.test(line), line };
}

export function stockfishTarget(transcript, { actor, sideToMove, completed }) {
  if (!['w','b'].includes(actor) || !['w','b'].includes(sideToMove)) throw Error('Invalid score perspective');
  // Only the latest score-bearing line is eligible; never fall back from a bound
  // or incomplete latest score to a stale exact score.
  const latest = transcript.filter(line => /^info depth .*\bscore (cp|mate) /.test(line)).at(-1);
  const info = latest ? parseStockfishInfo(latest) : null;
  if (!completed || !info || info.bounded) return { available: false, teachingAllowed: false, reason: 'Incomplete or bounded engine estimate' };
  const polarity = actor === sideToMove ? 1 : -1;
  const utility = polarity * (info.wdl[0] - info.wdl[2]) / 1000;
  return { available: true, teachingAllowed: true, utility, actor, sideToMove,
    actorScore: polarity * info.score, info, meaning: 'Searched engine target; WDL model utility, not certified truth or fly win probability' };
}

export function provisionalMBONValue(row, scale = 1) {
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(row?.MBON12) || !Number.isFinite(row?.MBON01)
      || row.MBON12 < 0 || row.MBON01 < 0) throw Error('Invalid provisional neural value');
  if (row.MBON12 === 0 && row.MBON01 === 0) return null;
  // Fixed monotonic transform: no teacher fitting and no changed move ordering.
  return Math.tanh((row.MBON12 - row.MBON01) / scale);
}
