// Bounded diagnostic trace for the mapped learning circuit. Values are model
// rates at each recurrent state, not biological spike times or calcium signals.
export function mappedActivityTrace(model, rest, mapping, {
  maxCells = 2048, maxStates = 17,
} = {}) {
  if (!model || !Array.isArray(model.h) || !Number.isSafeInteger(model.n)
    || !(rest instanceof Float32Array) || rest.length !== model.n
    || !Array.isArray(mapping?.groups) || mapping.groups.length < 1 || mapping.groups.length > 16
    || !Number.isSafeInteger(maxCells) || maxCells < 1 || maxCells > 4096
    || !Number.isSafeInteger(maxStates) || maxStates < 2 || maxStates > 65
    || model.h.length > maxStates || model.h.some(state => state.length !== model.n))
    throw Error('Invalid or over-budget mapped activity trace');

  const groupCells = mapping.groups.map(group => {
    if (!Array.isArray(group.kc) || !Array.isArray(group.dan)
      || typeof group.side !== 'string' || typeof group.mbonType !== 'string'
      || typeof group.danType !== 'string') throw Error('Invalid mapped activity group');
    return { group, kc: [...new Set(group.kc)], dan: [...new Map(group.dan.map(cell => [cell.index, cell])).values()] };
  });
  const cellCount = groupCells.reduce((sum, group) => sum + group.kc.length + group.dan.length, 0);
  if (cellCount > maxCells || cellCount * model.h.length > 65536)
    throw Error('Mapped activity trace exceeds cell/state budget');

  const traceCell = (index, identity = {}) => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= model.n
      || !Number.isFinite(rest[index])) throw Error('Invalid mapped activity cell');
    const rates = model.h.map(state => state[index]);
    if (!rates.every(Number.isFinite)) throw Error('Nonfinite mapped activity');
    return { index, ...identity, rest: rest[index], rates,
      excess: rates.map(rate => rate - rest[index]) };
  };

  return { schema: 'mapped-circuit-activity-trace-v1', states: model.h.length,
    meaning: 'Leaky simulated activity rates at recurrent states, relative to the stored rest vector; not biological spikes.',
    groups: groupCells.map(({ group, kc, dan }) => ({ side: group.side,
      mbonType: group.mbonType, danType: group.danType,
      kenyonCells: kc.map(index => traceCell(index)),
      dopamineCells: dan.map(cell => traceCell(cell.index, { rootId: cell.rootId })) })) };
}
