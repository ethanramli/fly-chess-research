// D4 candidate readout for Stage 1 after full-r14 (report research/reports/stage1-full-r14-2026-10-30/README.md):
// the long-term alpha-lobe valence, readout terms -MBON07 + MBON14 of brain v5. Fixed polarity, no fitting;
// draft pending researcher decision.
export function alphaLobeValence(row){
  if(!Number.isFinite(row?.MBON07)||!Number.isFinite(row?.MBON14)||row.MBON07<0||row.MBON14<0)
    throw new Error('Invalid alpha-lobe valence row');
  return row.MBON14-row.MBON07;
}

export function alphaLobeValenceSign(row){
  return Math.sign(alphaLobeValence(row))||0;
}
