"""Synthetic checks for build_fly_connections_apl.py. Reads no production graph, skeleton or projection."""
import json
import shutil
import struct
import subprocess
import tempfile
import unittest
from pathlib import Path

import numpy as np

import build_fly_connections_apl as builder
from build_fly_connections_apl import CompileError, build_tree, compile_package, sha

LIMITS = {'wallSeconds': 600.0, 'rssMiB': 2048.0, 'freeMiB': 256.0, 'cpuDuty': 1.0}
OBSERVE = lambda: (100.0, 4096.0)  # noqa: E731 - stub for the process observer
LOADER_URL = (builder.ROOT / '.codebase/src/neural-learning/fly-connections-apl-data-v1.mjs').as_uri()
APL_URL = (builder.ROOT / '.codebase/src/neural-learning/fly-connections-apl-v1.mjs').as_uri()
# Runs the real loader and installLocalApl on a stub model whose CSR graph is the fixture graph.
INSTALL_CHECK = """import { readFileSync } from 'node:fs';
const [, , loaderUrl, aplUrl, dir, graphPath] = process.argv;
const { loadLocalAplPackage } = await import(loaderUrl);
const { installLocalApl } = await import(aplUrl);
const graph = JSON.parse(readFileSync(graphPath, 'utf8'));
const model = {
  graph: { row: graph.row, col: graph.col, sign: graph.sign }, config: {}, h: [new Float64Array(graph.row.length - 1)],
  sparseAccumulator: { prepare() {}, accumulate() {}, weight: new Float64Array(graph.col.length) },
};
const pkg = await loadLocalAplPackage(dir);
const installed = installLocalApl(model, pkg);
console.log(JSON.stringify({ slots: pkg.apls.map((a) => a.slot), indices: pkg.apls.map((a) => a.index), identity: installed.identity }));
"""

# Node indices: 0 APL left (12), 1 APL right (11), 2-4 annotated KC (21, 22, 23), 5 non-KC (31), 6 annotated KC without contacts (24).
# The APL graph indices (right 1, left 0) deliberately differ from the declared slots (right = slot 0, left = slot 1).
NODE_ROOTS = [12, 11, 21, 22, 23, 31, 24]
# (pre, post, syn_count, sign). Retained: 2->1, 3->1, 2->0, 1->2, 0->3, 1->4. Not retained: 5->1 and 1->5.
GRAPH_EDGES = [(2, 1, 3, 1), (3, 1, 2, 1), (5, 1, 4, 1), (2, 0, 1, 1), (1, 2, 2, -1), (0, 3, 2, -1), (1, 4, 1, -1), (1, 5, 2, -1)]
RIGHT = {'vertices': [[0, 0, 0], [100, 0, 0], [200, 0, 0], [100, 100, 0], [100, 100, 0], [0, -50, 0]],
         'edges': [[0, 1], [1, 2], [1, 3], [3, 4], [0, 5]]}  # edge 3 has zero length; total 350 nm
LEFT = {'vertices': [[0, 0, 0], [300, 0, 0], [300, 400, 0]], 'edges': [[0, 1], [1, 2]]}  # total 700 nm
# source_row, pre_root, post_root, apl_root, skeleton_edge, fraction, residual_nm
ROWS = [
    (101, '21', '11', '11', 0, 0.25, 1.5),
    (102, '21', '11', '11', 2, 0.5, 2.0),
    (103, '21', '11', '11', 3, 0.5, 0.0),
    (104, '22', '11', '11', 4, 0.0, 0.5),
    (105, '22', '11', '11', 4, 1.0, 0.5),
    (106, '11', '21', '11', 1, 0.75, 3.0),
    (107, '11', '21', '11', 2, 0.5, 1.0),
    (108, '11', '23', '11', 0, 0.25, 0.25),
    (109, '21', '12', '12', 1, 0.5, 1.0),
    (110, '12', '22', '12', 1, 0.5, 0.0),
    (111, '12', '22', '12', 0, 1.0, 0.0),
]
CANONICAL = [
    {'synapseId': '1', 'sourceRow': 103, 'aplRoot': '11', 'direction': 'KC-to-APL',
     'midpointProjection': [3, 0.5, 0.0], 'aplSideProjection': [0, 0.9, 2.5]},
    {'synapseId': '2', 'sourceRow': 110, 'aplRoot': '12', 'direction': 'APL-to-KC',
     'midpointProjection': [1, 0.5, 0.0], 'aplSideProjection': [1, 0.25, 1.0]},
]


def load_sites(out):
    # Close the archive so the temporary directory can be removed on Windows.
    with np.load(out / 'sites.npz') as archive:
        return {key: archive[key] for key in archive.files}


def depth(parent, length, node):
    total = 0.0
    while node != -1:
        total += float(length[node])
        node = int(parent[node])
    return total


def skeleton_bytes(vertices, edges):
    v, e = np.asarray(vertices, '<f4'), np.asarray(edges, '<u4')
    return struct.pack('<II', len(v), len(e)) + v.tobytes() + e.tobytes() + np.ones(len(v), '<f4').tobytes()


def graph_arrays(edges):
    ordered = sorted(edges, key=lambda e: (e[1], e[0]))
    counts = np.bincount([e[1] for e in ordered], minlength=len(NODE_ROOTS))
    return {'root_ids': np.array(NODE_ROOTS, np.int64), 'csr_indptr': np.concatenate([[0], np.cumsum(counts)]).astype(np.int64),
            'csr_indices': np.array([e[0] for e in ordered], np.int32), 'syn_count': np.array([e[2] for e in ordered], np.int32),
            'sign': np.array([e[3] for e in ordered], np.int8)}


def fixture(base, rows=ROWS, edges=GRAPH_EDGES, sample=None):
    base = Path(base)
    base.mkdir(parents=True)
    graph, tsv, right, left = base / 'graph.npz', base / 'annotations.tsv', base / 'right.precomputed', base / 'left.precomputed'
    proj, result, manifest = base / 'projections.csv', base / 'result.json', base / 'manifest.json'
    np.savez(str(graph), **graph_arrays(edges))
    tsv.write_text('\n'.join(['root_id\tcell_class\themibrain_type\tside', '11\tMBIN\tAPL\tright', '12\tMBIN\tAPL\tleft',
                              '21\tKenyon_Cell\t\tleft', '22\tKenyon_Cell\t\tleft', '23\tKenyon_Cell\t\tright',
                              '24\tKenyon_Cell\t\tright', '31\tMBIN\t\tright']) + '\n', encoding='utf-8')
    right.write_bytes(skeleton_bytes(RIGHT['vertices'], RIGHT['edges']))
    left.write_bytes(skeleton_bytes(LEFT['vertices'], LEFT['edges']))
    lines = [','.join(builder.HEADER)] + [','.join(str(x) for x in row) for row in rows]
    proj.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    result.write_text(json.dumps({'canonicalSample': [] if sample is None else sample}), encoding='utf-8')
    manifest.write_text(json.dumps({'status': 'complete', 'projectionsSha256': sha(proj), 'resultSha256': sha(result)}), encoding='utf-8')
    files = {'graph': graph, 'annotations': tsv, 'projections': proj, 'attachmentResult': result,
             'skeleton:11': right, 'skeleton:12': left}
    return {'graph': graph, 'annotations': tsv, 'projections': proj, 'attachmentManifest': manifest, 'attachmentResult': result,
            'apls': [{'root': '11', 'side': 'right', 'skeleton': right}, {'root': '12', 'side': 'left', 'skeleton': left}],
            'pins': {key: sha(path) for key, path in files.items()},
            'expectedPairs': 6, 'expectedContacts': 11, 'expectedCanonical': 2}


class TreeTests(unittest.TestCase):
    def test_zero_length_coincident_and_endpoint_sites(self):
        tree = build_tree([[0, 0, 0], [0, 0, 0]], [[0, 1]], [0, 0, 0, 0], [0.5, 0.5, 0.0, 1.0])
        self.assertEqual(tree['nodes'], 3)  # two endpoints plus one shared interior node
        self.assertEqual(tree['subdivisionSites'], 1)
        self.assertEqual(tree['site'][0], tree['site'][1])
        self.assertEqual(tree['site'][2], 0)  # fraction 0 reuses the start vertex
        self.assertNotEqual(tree['site'][3], tree['site'][2])
        self.assertEqual(float(tree['lengthNm'].sum()), 0.0)
        self.assertEqual(tree['parent'][0], -1)
        self.assertTrue(all(tree['parent'][i] < i for i in range(1, tree['nodes'])))

    def test_branch_lengths_match_hand_computed_depths(self):
        v, e = RIGHT['vertices'], RIGHT['edges']
        tree = build_tree(v, e, [0, 2, 3, 4, 4, 1, 2, 0], [0.25, 0.5, 0.5, 0.0, 1.0, 0.75, 0.5, 0.25])
        expected = [25, 150, 200, 0, 50, 175, 150, 25]
        got = [depth(tree['parent'], tree['length64'], int(s)) for s in tree['site']]
        for g, x in zip(got, expected):
            self.assertAlmostEqual(g, x, places=9)
        self.assertAlmostEqual(tree['treeLengthSumNm'], 350.0, places=9)

    def test_float32_conversion_error_is_bounded(self):
        tree = build_tree(RIGHT['vertices'], RIGHT['edges'], [0, 2, 4, 1], [0.3, 0.7, 1 / 3, 0.1])
        error = np.abs(tree['lengthNm'].astype(np.float64) - tree['length64'])
        self.assertTrue(bool((error <= 2.0 ** -24 * np.abs(tree['length64'])).all()))

    def test_rejects_non_tree_disconnected_and_bad_site_inputs(self):
        cases = [
            ([[0, 0, 0], [1, 0, 0], [2, 0, 0]], [[0, 1], [1, 2], [0, 2]], [], [], 'not a tree'),
            ([[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]], [[0, 1], [1, 2], [2, 0]], [], [], 'disconnected'),
            ([[0, 0, 0], [1, 0, 0]], [[0, 1]], [0], [1.5], 'fraction'),
            ([[0, 0, 0], [1, 0, 0]], [[0, 1]], [0], [float('nan')], 'fraction'),
            ([[0, 0, 0], [1, 0, 0]], [[0, 1]], [1], [0.5], 'skeleton edge out of range'),
        ]
        for vertices, edges, ids, fractions, message in cases:
            with self.subTest(message=message), self.assertRaisesRegex(CompileError, message):
                build_tree(vertices, edges, ids, fractions)


class CompileTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def compile(self, name, geometry='midpoint', mutate=None, **fixture_args):
        inputs = fixture(self.base / f'{name}-in', **fixture_args)
        if mutate:
            mutate(inputs)
        out = self.base / f'{name}-out'
        summary = compile_package(out, inputs, geometry, LIMITS, observe=OBSERVE)
        return out, summary

    def test_midpoint_package_matches_hand_computed_tree(self):
        out, summary = self.compile('mid')
        package = json.loads((out / 'package.json').read_text(encoding='utf-8'))
        self.assertEqual((package['schema'], package['status'], package['units']), ('fly-apl-sites-v1-package', 'complete', 'nm'))
        self.assertEqual(summary['graphPasses'], 0)
        self.assertIn('second-nearest-branch', summary['geometryCoverage']['notImplemented'][0])
        arrays = load_sites(out)
        self.assertEqual(sorted(arrays), sorted(['kc_indices'] + [f'a{k}_{key}' for k in (0, 1) for key in builder.KEYS]))
        self.assertEqual(arrays['kc_indices'].tolist(), [2, 3, 4, 6])
        self.assertEqual([a['nodes'] for a in package['apls']], [10, 4])
        self.assertEqual([(a['slot'], a['index']) for a in package['apls']], [(0, 1), (1, 0)])
        rp, rl, lp, ll = arrays['a0_parent'], arrays['a0_lengthNm'], arrays['a1_parent'], arrays['a1_lengthNm']
        self.assertEqual(rp[0], -1)
        self.assertTrue(all(rp[i] < i for i in range(1, len(rp))))
        self.assertAlmostEqual(float(rl.sum()), 350.0, places=3)
        self.assertAlmostEqual(float(ll.sum()), 700.0, places=3)
        self.assertEqual([depth(rp, rl, int(s)) for s in arrays['a0_inputSite']], [25, 150, 200, 0, 50])
        self.assertEqual([depth(rp, rl, int(s)) for s in arrays['a0_outputSite']], [175, 150, 25])
        self.assertEqual([depth(lp, ll, int(s)) for s in arrays['a1_inputSite']], [500])
        self.assertEqual([depth(lp, ll, int(s)) for s in arrays['a1_outputSite']], [500, 300])
        self.assertEqual(arrays['a0_inputKC'].tolist(), [2, 2, 2, 3, 3])
        self.assertEqual(arrays['a0_inputEdge'].tolist(), [1, 1, 1, 2, 2])
        self.assertEqual(arrays['a0_outputKC'].tolist(), [2, 2, 4])
        self.assertEqual(arrays['a0_outputEdge'].tolist(), [4, 4, 6])
        self.assertEqual(arrays['a1_inputKC'].tolist(), [2])
        self.assertEqual(arrays['a1_inputEdge'].tolist(), [0])
        self.assertEqual(arrays['a1_outputKC'].tolist(), [3, 3])
        self.assertEqual(arrays['a1_outputEdge'].tolist(), [5, 5])
        # co-located contacts keep separate rows but share one tree site
        self.assertEqual(arrays['a0_inputSite'][1], arrays['a0_outputSite'][1])
        self.assertEqual(arrays['a0_inputSite'][0], arrays['a0_outputSite'][2])
        # Each typed contact edge is the original CSR edge: its column is the KC (input) or APL (output), its row the APL index or KC.
        csr = graph_arrays(GRAPH_EDGES)

        def post(edge):
            return int(np.searchsorted(csr['csr_indptr'], edge, side='right') - 1)

        for k, index in ((0, 1), (1, 0)):
            for edge, kc in zip(arrays[f'a{k}_inputEdge'].tolist(), arrays[f'a{k}_inputKC'].tolist()):
                self.assertEqual((int(csr['csr_indices'][edge]), post(edge)), (kc, index))
            for edge, kc in zip(arrays[f'a{k}_outputEdge'].tolist(), arrays[f'a{k}_outputKC'].tolist()):
                self.assertEqual((int(csr['csr_indices'][edge]), post(edge)), (index, kc))

    def install_in_node(self, package_dir, csr):
        graph_path = package_dir.with_name(package_dir.name + '-graph.json')
        graph_path.write_text(json.dumps(csr), encoding='utf-8')
        script = self.base / 'install-check.mjs'
        script.write_text(INSTALL_CHECK, encoding='utf-8')
        return subprocess.run([shutil.which('node'), str(script), LOADER_URL, APL_URL, str(package_dir), str(graph_path)],
                              capture_output=True, text=True, timeout=120)

    def test_compiled_package_installs_on_graph_indices(self):
        if shutil.which('node') is None:
            self.skipTest('node is not on PATH')
        out, _ = self.compile('e2e')
        graph = graph_arrays(GRAPH_EDGES)
        csr = {'row': graph['csr_indptr'].tolist(), 'col': graph['csr_indices'].tolist(), 'sign': graph['sign'].tolist()}
        done = self.install_in_node(out, csr)
        self.assertEqual(done.returncode, 0, done.stderr)
        report = json.loads(done.stdout)
        self.assertEqual((report['slots'], report['indices']), ([0, 1], [1, 0]))
        self.assertRegex(report['identity'], r'^[0-9a-f]{64}$')
        # Control: the pre-fix producer wrote slot ordinals as graph indices. Installation must reject that binding.
        buggy = self.base / 'e2e-buggy'
        shutil.copytree(out, buggy)
        package = json.loads((buggy / 'package.json').read_text(encoding='utf-8'))
        for slot, apl in enumerate(package['apls']):
            apl['index'] = slot
        (buggy / 'package.json').write_text(json.dumps(package), encoding='utf-8')
        failed = self.install_in_node(buggy, csr)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn('Invalid APL input contact', failed.stderr)

    def test_source_row_map_is_complete_and_sorted(self):
        out, _ = self.compile('map')
        lines = (out / 'source-row-map.csv').read_text(encoding='utf-8').splitlines()
        self.assertEqual(lines[0].split(','), builder.MAP_HEADER)
        rows = [line.split(',') for line in lines[1:]]
        self.assertEqual([int(r[0]) for r in rows], list(range(101, 112)))
        self.assertEqual({r[14] for r in rows}, {'midpoint'})

    def test_canonical_stress_replaces_only_sampled_sites(self):
        out, summary = self.compile('canon', geometry='canonical-stress', sample=CANONICAL)
        self.assertEqual(summary['cardinalities']['canonicalReplaced'], 2)
        arrays = load_sites(out)
        rp, rl, lp, ll = arrays['a0_parent'], arrays['a0_lengthNm'], arrays['a1_parent'], arrays['a1_lengthNm']
        self.assertEqual(len(rp), 10)
        self.assertEqual(len(lp), 5)
        self.assertDepths([depth(rp, rl, int(s)) for s in arrays['a0_inputSite']], [25, 150, 90, 0, 50])
        self.assertDepths([depth(lp, ll, int(s)) for s in arrays['a1_outputSite']], [400, 300])
        self.assertDepths([depth(lp, ll, int(s)) for s in arrays['a1_inputSite']], [500])
        self.assertDepths([depth(rp, rl, int(s)) for s in arrays['a0_outputSite']], [175, 150, 25])

    def assertDepths(self, got, expected):
        # float32 storage: 0.9 and 0.25 are not both exact, so compare within 1e-3 nm
        self.assertEqual(len(got), len(expected))
        for g, x in zip(got, expected):
            self.assertAlmostEqual(g, x, delta=1e-3)

    def test_rejects_bad_projection_rows(self):
        mutations = {
            'unretained root pair': (lambda r: r.__setitem__(0, (101, '21', '31', '11', 0, 0.25, 1.5)), 'not a retained'),
            'apl_root mismatch': (lambda r: r.__setitem__(8, (109, '21', '12', '11', 1, 0.5, 1.0)), 'apl_root'),
            'fraction above one': (lambda r: r.__setitem__(1, (102, '21', '11', '11', 2, 1.5, 2.0)), 'fraction'),
            'nonfinite fraction': (lambda r: r.__setitem__(1, (102, '21', '11', '11', 2, 'nan', 2.0)), 'not finite'),
            'skeleton edge out of range': (lambda r: r.__setitem__(3, (104, '22', '11', '11', 9, 0.0, 0.5)), 'outside APL'),
            'negative residual': (lambda r: r.__setitem__(4, (105, '22', '11', '11', 4, 1.0, -1.0)), 'negative'),
            'duplicate source_row': (lambda r: r.__setitem__(2, (102, '21', '11', '11', 3, 0.5, 0.0)), 'duplicate source_row'),
            'pair count mismatch': (lambda r: r.__setitem__(3, (104, '21', '11', '11', 4, 0.0, 0.5)), 'contact count mismatch'),
        }
        for label, (mutate, message) in mutations.items():
            rows = list(ROWS)
            mutate(rows)
            with self.subTest(label=label), self.assertRaisesRegex(CompileError, message):
                self.compile(label.replace(' ', '-'), rows=rows)

    def test_rejects_missing_and_extra_contacts(self):
        with self.assertRaisesRegex(CompileError, 'missing contacts'):
            self.compile('missing', rows=ROWS[:-1])
        with self.assertRaisesRegex(CompileError, 'more rows'):
            self.compile('extra', rows=ROWS + [(120, '21', '11', '11', 0, 0.25, 1.0)])

    def test_rejects_wrong_graph_sign_and_wrong_side(self):
        bad_sign = [e if e != (1, 2, 2, -1) else (1, 2, 2, 1) for e in GRAPH_EDGES]
        with self.assertRaisesRegex(CompileError, 'sign differs'):
            self.compile('sign', edges=bad_sign)

        def wrong_side(inputs):
            inputs['apls'][0]['side'] = 'left'
        with self.assertRaisesRegex(CompileError, 'side differs'):
            self.compile('side', mutate=wrong_side)

    def test_rejects_pin_mismatch_before_creating_output(self):
        def wrong_pin(inputs):
            inputs['pins']['graph'] = '0' * 64
        with self.assertRaisesRegex(CompileError, 'pinned identity mismatch: graph'):
            self.compile('pin', mutate=wrong_pin)
        self.assertFalse((self.base / 'pin-out').exists())

    def test_rejects_bad_canonical_records(self):
        absent = [dict(CANONICAL[0], sourceRow=999), CANONICAL[1]]
        duplicate = [CANONICAL[0], dict(CANONICAL[0])]
        wrong_root = [dict(CANONICAL[0], aplRoot='12'), CANONICAL[1]]
        for label, sample, message in [('absent', absent, 'absent'), ('duplicate', duplicate, 'duplicate canonical'),
                                       ('root', wrong_root, 'differs from the row binding')]:
            with self.subTest(label=label), self.assertRaisesRegex(CompileError, message):
                self.compile(f'canon-{label}', geometry='canonical-stress', sample=sample)

    def test_refuses_existing_output_and_keeps_failed_partials(self):
        inputs = fixture(self.base / 'fresh-in', sample=CANONICAL[:1])  # one record for an expected count of two
        existing = self.base / 'existing-out'
        existing.mkdir()
        with self.assertRaises(FileExistsError):
            compile_package(existing, inputs, 'midpoint', LIMITS, observe=OBSERVE)
        failed = self.base / 'failed-out'
        with self.assertRaisesRegex(CompileError, 'canonical sample has 1 records, expected 2'):
            compile_package(failed, inputs, 'canonical-stress', LIMITS, observe=OBSERVE)
        manifest = json.loads((failed / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(manifest['status'], 'failed')
        self.assertTrue((failed / 'records.jsonl.partial').exists())
        self.assertFalse((failed / 'package.json').exists())


if __name__ == '__main__':
    unittest.main()
