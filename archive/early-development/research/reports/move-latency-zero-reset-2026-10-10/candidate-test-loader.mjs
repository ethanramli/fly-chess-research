// Test isolation only: use the staged candidate without editing pinned sources.
const trainer = new URL('../../../.codebase/src/supervised-baselines/trainer.mjs', import.meta.url).href;
const candidate = new URL('./candidate-trainer.mjs', import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  return resolved.url === trainer ? { ...resolved, url: candidate } : resolved;
}
