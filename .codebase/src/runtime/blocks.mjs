// Deterministic incoming-neighbor packing. Every receiving row occurs exactly
// once, including disconnected/isolated neurons. This is not a min-cut solver.
export function partitionGraph(graph, size = 4096) {
  if (!Number.isSafeInteger(size) || size < 1) throw Error('Invalid block size');
  const n = graph.row.length - 1, assigned = new Uint8Array(n), blocks = [];
  const seeds = Array.from({ length: n }, (_, i) => i).sort((a, b) =>
    (graph.row[b + 1] - graph.row[b]) - (graph.row[a + 1] - graph.row[a]) || a - b);
  let seedIndex = 0, covered = 0;
  while (covered < n) {
    const nodes = [];
    let q = 0;
    while (nodes.length < size && covered < n) {
      if (q === nodes.length) {
        while (assigned[seeds[seedIndex]]) seedIndex++;
        const root = seeds[seedIndex++];
        assigned[root] = 1; nodes.push(root); covered++;
      }
      const j = nodes[q++];
      for (let e = graph.row[j]; e < graph.row[j + 1] && nodes.length < size; e++) {
        const i = graph.col[e];
        if (!assigned[i]) { assigned[i] = 1; nodes.push(i); covered++; }
      }
    }
    blocks.push(nodes);
  }
  return blocks;
}
