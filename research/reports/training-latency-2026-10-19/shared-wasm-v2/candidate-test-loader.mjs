// Test process only. Production and queued sources remain untouched.
const replacements = new Map([
  [new URL('../../../../.codebase/src/supervised-baselines/trainer.mjs', import.meta.url).href,
    new URL('./candidate-trainer.mjs', import.meta.url).href],
  [new URL('../../../../.codebase/src/runtime/sparse-accumulator.mjs', import.meta.url).href,
    new URL('./candidate-accumulator.mjs', import.meta.url).href],
]);
export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  return replacements.has(resolved.url) ? {...resolved, url: replacements.get(resolved.url)} : resolved;
}
