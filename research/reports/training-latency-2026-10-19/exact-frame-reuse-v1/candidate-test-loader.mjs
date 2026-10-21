// Test/replay processes only; frozen original source files stay unchanged.
const originalTrainer = new URL('../../../../.codebase/src/supervised-baselines/trainer.mjs', import.meta.url).href;
const originalEpisode = new URL('../../../../.codebase/src/neural-learning/neural-episode.mjs', import.meta.url).href;
const candidateEpisode = new URL('./candidate-episode.mjs', import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (result.url === originalTrainer)
    return {...result, url: new URL('../../../../.codebase/src/supervised-baselines/trainer-reuse-candidate.mjs', import.meta.url).href};
  if (result.url === originalEpisode && context.parentURL !== candidateEpisode)
    return {...result, url: candidateEpisode};
  return result;
}
