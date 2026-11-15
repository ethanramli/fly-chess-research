#!/usr/bin/env node
// Counts the output cells of each type in the annotation file, as the three-board probes count them, for the offline check of the
// reading-before-feedback rule (documentation/design/neural-learning/three-board-reading-before-feedback-2026-11-15.md). Reads only that file.
// Usage (repo root): node --max-old-space-size=256 .codebase/scripts/neural-learning/count-output-cells-v1.mjs --annotations TSV
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { countOutputCells } from '../../src/neural-learning/reading-before-feedback-check-v1.mjs';
const { values: args } = parseArgs({ options: { annotations: { type: 'string' } } });
if (!args.annotations) throw Error('Need --annotations TSV');
const { counts, repeatedRoots } = await countOutputCells(createInterface({ input: createReadStream(args.annotations), crlfDelay: Infinity }));
console.log(JSON.stringify({ annotations: args.annotations, outputCells: counts, repeatedRoots }, null, 1));
console.log('These counts assume every annotated output cell is in the graph; the probes skip any that are not. probe-wide-learning-v4.mjs records its own counts for comparison.');
