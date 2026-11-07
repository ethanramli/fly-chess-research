// Loads a compiled APL site package written by python actions/build_fly_connections_apl.py.
// Offline data only: no propagation, learning or network access. Only the declared arrays are read,
// through the unchanged readNpz; sites.npz is hashed by streaming before any array is parsed.
// apls[].index is the APL's neuron index in the pinned graph (installLocalApl binds it to model.graph).
// apls[].slot is the enumerated array ordinal: its arrays are named a{slot}_<key>. The two are never interchanged.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { readNpz } from '../runtime/graph.mjs';

const SCHEMA = 'fly-apl-sites-v1-package';
const KEYS = ['parent', 'lengthNm', 'inputSite', 'inputKC', 'inputEdge', 'outputSite', 'outputKC', 'outputEdge'];
const MAX_PACKAGE_BYTES = 1 << 20;
const ROOT_ID = /^[1-9][0-9]{0,19}$/;
const HEX64 = /^[0-9a-f]{64}$/;

function fail(message) {
  throw new Error(`APL package: ${message}`);
}

function nonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label} is not a non-negative integer`);
  return value;
}

async function sha256File(path) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

export async function loadLocalAplPackage(directory) {
  const packageBytes = await readFile(join(directory, 'package.json'));
  if (packageBytes.length > MAX_PACKAGE_BYTES) fail('package.json is too large');
  const pkg = JSON.parse(packageBytes.toString('utf8'));
  if (pkg.schema !== SCHEMA || pkg.status !== 'complete') fail('schema or status is not a complete package');
  if (pkg.sitesFile !== 'sites.npz' || pkg.kcIndicesArray !== 'kc_indices' || pkg.units !== 'nm') fail('file or unit declaration differs');
  if (!HEX64.test(pkg.sitesSha256 ?? '')) fail('sitesSha256 is malformed');
  if (!Array.isArray(pkg.apls) || pkg.apls.length < 1 || pkg.apls.length > 16) fail('APL list is missing or too long');

  const sitesPath = join(directory, pkg.sitesFile);
  const info = await stat(sitesPath).catch(() => null);
  if (!info?.isFile()) fail('sites.npz is missing');
  if ((await sha256File(sitesPath)) !== pkg.sitesSha256) fail('sites.npz hash differs from package.json');

  const apls = pkg.apls.map((apl, slot) => {
    if (apl?.slot !== slot) fail(`APL slot ${slot} declares slot ${apl?.slot}`);
    if (!Number.isSafeInteger(apl.index) || apl.index < 0) fail(`APL slot ${slot} graph index is invalid`);
    if (typeof apl.rootId !== 'string' || !ROOT_ID.test(apl.rootId)) fail(`APL slot ${slot} identity is invalid`);
    if (!apl.arrays || Object.keys(apl.arrays).length !== KEYS.length) fail(`APL slot ${slot} array declarations differ`);
    for (const key of KEYS) if (apl.arrays[key] !== `a${slot}_${key}`) fail(`APL slot ${slot} array name ${key} differs`);
    return { ...apl, nodes: nonNegativeInteger(apl.nodes, 'nodes'), inputs: nonNegativeInteger(apl.inputs, 'inputs'),
      outputs: nonNegativeInteger(apl.outputs, 'outputs') };
  });
  const roots = new Set(), indices = new Set();
  for (const apl of apls) {
    if (roots.has(apl.rootId)) fail(`duplicate APL root ${apl.rootId}`);
    if (indices.has(apl.index)) fail(`duplicate graph index ${apl.index}`);
    roots.add(apl.rootId);
    indices.add(apl.index);
  }

  const names = [pkg.kcIndicesArray, ...apls.flatMap((apl) => KEYS.map((key) => apl.arrays[key]))];
  const arrays = readNpz(sitesPath, names);
  const kcIndices = arrays.kc_indices;
  if (!(kcIndices instanceof Int32Array)) fail('kc_indices must be int32');
  const kcSet = new Set(kcIndices);
  if (kcSet.size !== kcIndices.length || kcIndices.some((x) => x < 0)) fail('kc_indices must be unique and non-negative');

  const result = apls.map((apl, slot) => {
    const get = (key) => arrays[apl.arrays[key]];
    const parent = get('parent');
    const lengthNm = get('lengthNm');
    if (!(parent instanceof Int32Array) || !(lengthNm instanceof Float32Array)) fail(`APL slot ${slot} parent or length type differs`);
    const N = apl.nodes;
    if (N < 1 || parent.length !== N || lengthNm.length !== N) fail(`APL slot ${slot} node count differs`);
    if (parent[0] !== -1 || lengthNm[0] !== 0) fail(`APL slot ${slot} root is not first with zero length`);
    for (let i = 1; i < N; i++) {
      if (!(parent[i] >= 0 && parent[i] < i)) fail(`APL slot ${slot} parent order fails at node ${i}`);
      if (!(Number.isFinite(lengthNm[i]) && lengthNm[i] >= 0)) fail(`APL slot ${slot} length invalid at node ${i}`);
    }
    for (const [prefix, count] of [['input', apl.inputs], ['output', apl.outputs]]) {
      const site = get(`${prefix}Site`), kc = get(`${prefix}KC`), edge = get(`${prefix}Edge`);
      for (const array of [site, kc, edge]) {
        if (!(array instanceof Int32Array) || array.length !== count) fail(`APL slot ${slot} ${prefix} arrays differ in count`);
      }
      for (let i = 0; i < count; i++) {
        if (site[i] < 0 || site[i] >= N) fail(`APL slot ${slot} ${prefix} site ${i} is outside the tree`);
        if (!kcSet.has(kc[i])) fail(`APL slot ${slot} ${prefix} KC ${kc[i]} is not an annotated retained KC`);
        if (edge[i] < 0) fail(`APL slot ${slot} ${prefix} edge ${i} is negative`);
      }
    }
    return { rootId: apl.rootId, index: apl.index, slot, parent, lengthNm, inputSite: get('inputSite'), inputKC: get('inputKC'),
      inputEdge: get('inputEdge'), outputSite: get('outputSite'), outputKC: get('outputKC'), outputEdge: get('outputEdge') };
  });

  const identity = createHash('sha256').update(packageBytes).update(pkg.sitesSha256).digest('hex');
  return { schema: 'fly-apl-sites-v1', identity, kcIndices, apls: result };
}
