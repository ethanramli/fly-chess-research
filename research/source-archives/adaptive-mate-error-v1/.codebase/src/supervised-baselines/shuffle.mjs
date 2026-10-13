import { random } from './trainer.mjs';

// Bounded streaming shuffle. The same source, seed and buffer size regenerate
// the same order, allowing a resume cursor without saving a corpus in RAM.
// This is not a uniform permutation of the whole dataset unless it fits.
export async function* shuffledRows(source, { bufferSize = 24, seed = 1 } = {}) {
  if (!Number.isSafeInteger(bufferSize) || bufferSize < 1 || bufferSize > 4096
    || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw Error('Invalid shuffle configuration');
  const buffer = [], rng = random(seed);
  for await (const row of source) {
    if (buffer.length < bufferSize) buffer.push(row);
    else {
      const index = Math.floor(rng() * buffer.length);
      const selected = buffer[index]; buffer[index] = row;
      yield selected;
    }
  }
  while (buffer.length) {
    const index = Math.floor(rng() * buffer.length);
    const selected = buffer[index];
    buffer[index] = buffer[buffer.length - 1]; buffer.pop();
    yield selected;
  }
}
