// Observation only: the existing trainer still computes every row and history.
import assert from 'node:assert/strict';

export function captureTrajectory(model, edges) {
  return {h: model.h.map(a => a.slice()), activity: model.activity.map(a => a.slice()),
    drive: model.drive.slice(), alpha: model.alpha.slice(), saturation: model.saturation,
    weights: Float64Array.from(edges, edge => model.signedMagnitude[edge])};
}

// Caller must independently pin topology and all weights outside `edges`.
// A row is reusable only if every numerical argument to that row is identical.
export function compareTrajectory(model, reference, edges, posts) {
  const {n, graph: g} = model;
  assert.equal(edges.length, posts.length);
  assert.equal(model.h.length, reference.h.length);
  assert.equal(model.activity.length, reference.activity.length);
  assert.equal(reference.drive.length, n);
  const baseDirty = new Uint8Array(n);
  for (let j = 0; j < n; j++) {
    if (!Object.is(model.drive[j], reference.drive[j])
      || !Object.is(model.alpha[j], reference.alpha[j])
      || !Object.is(model.saturation, reference.saturation)) baseDirty[j] = 1;
  }
  for (let i = 0; i < edges.length; i++) {
    assert(Number.isSafeInteger(posts[i]) && posts[i] >= 0 && posts[i] < n);
    assert(edges[i] >= g.row[posts[i]] && edges[i] < g.row[posts[i] + 1]);
    if (!Object.is(model.signedMagnitude[edges[i]], reference.weights[i])) baseDirty[posts[i]] = 1;
  }
  return model.activity.map((act, t) => {
    const changed = new Uint8Array(n);
    let changedPrevious = 0, dirtyRows = 0, dirtyEdges = 0, changedNext = 0;
    for (let i = 0; i < n; i++) {
      if (!Object.is(model.h[t][i], reference.h[t][i])) {changed[i] = 1; changedPrevious++;}
    }
    for (let j = 0; j < n; j++) {
      let dirty = Boolean(baseDirty[j] || changed[j]);
      for (let k = g.row[j]; !dirty && k < g.row[j + 1]; k++) dirty = Boolean(changed[g.col[k]]);
      if (dirty) {dirtyRows++; dirtyEdges += g.row[j + 1] - g.row[j];}
      else {
        assert(Object.is(act[j], reference.activity[t][j]), `Unexpected clean activity row ${j}, step ${t}`);
        assert(Object.is(model.h[t + 1][j], reference.h[t + 1][j]), `Unexpected clean state row ${j}, step ${t}`);
      }
      if (!Object.is(model.h[t + 1][j], reference.h[t + 1][j])) changedNext++;
    }
    return {step: t, changedPrevious, changedNext, dirtyRows, dirtyEdges,
      reusableRowFraction: 1 - dirtyRows / n,
      reusableEdgeFraction: g.col.length ? 1 - dirtyEdges / g.col.length : 1};
  });
}
