"""Independent local data audit; no project-module imports or neural execution.

Run with the existing review environment Python. Stream one source at a time.
"""
import argparse
import ast
from bisect import bisect_right
import csv
import ctypes
import gzip
import hashlib
import json
import math
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path
import time
import struct
import sys
import zipfile

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.csv as acsv
import pyarrow.ipc as ipc

REPORT = Path(__file__).resolve().parent
ROOT = REPORT.parents[2]
BASE = ROOT / 'runs/memory-retention-2026-11-01'
APL = {'720575940613583001', '720575940624547622'}
FIELDS = ['pre_root_id', 'post_root_id', 'x', 'y', 'z']
START = time.monotonic()
RESOURCES = []


def guard():
    class Memory(ctypes.Structure):
        _fields_ = [('length', ctypes.c_ulong), ('load', ctypes.c_ulong)] + [(n, ctypes.c_ulonglong) for n in ['total', 'available', 'page', 'availablePage', 'virtual', 'availableVirtual', 'extended']]
    class Process(ctypes.Structure):
        _fields_ = [('cb', ctypes.c_ulong), ('faults', ctypes.c_ulong)] + [(n, ctypes.c_size_t) for n in ['peakWorking', 'working', 'peakPaged', 'paged', 'peakNonPaged', 'nonPaged', 'pageUse', 'peakPageUse']]
    m = Memory(); m.length = ctypes.sizeof(m)
    assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    p = Process(); p.cb = ctypes.sizeof(p)
    ctypes.windll.kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    assert ctypes.windll.psapi.GetProcessMemoryInfo(ctypes.c_void_p(ctypes.windll.kernel32.GetCurrentProcess()), ctypes.byref(p), p.cb)
    sample = {'elapsedSeconds': time.monotonic()-START, 'rssMiB': p.working/2**20, 'freeMiB': m.available/2**20}
    RESOURCES.append(sample)
    assert sample['elapsedSeconds'] <= 180 and sample['rssMiB'] <= 2048 and sample['freeMiB'] >= 256, sample


def load(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def sha(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def fill(values, last):
    # The only null marker is an empty CSV field; literal "null" must fail.
    markers = pc.drop_null(values)
    assert len(markers) == 0 or pc.all(pc.match_substring_regex(markers, '^[0-9]+$')).as_py()
    expanded = pc.fill_null_forward(values)
    if last is not None:
        expanded = pc.fill_null(expanded, last)
    assert expanded.null_count == 0, 'Unresolved initial identifier'
    return expanded, expanded[-1].as_py()


def graph_arrays(path):
    assert sys.byteorder == 'little'
    arrays = []
    with zipfile.ZipFile(path) as z:
        for name in ['root_ids', 'csr_indptr', 'csr_indices', 'syn_count', 'sign']:
            with z.open(name+'.npy') as f:
                assert f.read(8) == b'\x93NUMPY\x01\x00'
                header = ast.literal_eval(f.read(struct.unpack('<H', f.read(2))[0]).decode('ascii').strip())
                assert header['fortran_order'] is False and len(header['shape']) == 1
                data = f.read()
            fmt = {'<i8':'q', '<i4':'i', '<f4':'f', '|i1':'b'}[header['descr']]
            view = memoryview(data).cast(fmt)
            assert len(view) == header['shape'][0]
            arrays.append(view)
    return arrays


def batches(path, block=1<<20):
    previous = [None, None]
    options = acsv.ConvertOptions(column_types={k: pa.string() for k in FIELDS}, strings_can_be_null=True, null_values=[''])
    with gzip.open(path, 'rb') as f:
        with acsv.open_csv(f, read_options=acsv.ReadOptions(use_threads=False, block_size=block), convert_options=options) as reader:
            assert reader.schema.names == FIELDS
            for batch in reader:
                values = list(batch.columns)
                for j in range(2):
                    values[j], previous[j] = fill(values[j], previous[j])
                yield pa.RecordBatch.from_arrays(values, FIELDS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=REPORT/'data-prerequisite-audit.json')
    target = parser.parse_args().out.resolve()
    assert target.is_relative_to(ROOT) and not target.exists(), 'Fresh workspace audit output required'
    guard()
    static = BASE/'apl-locality-static-v2'
    subset = BASE/'apl-contact-subset-v3'
    probe = BASE/'canonical-synapse-probe-v1'
    points = BASE/'apl-point-semantics-v1'
    manifests = [load(p/'manifest.json') for p in [static, subset, points]]
    pins = {}
    for m in manifests:
        assert m['status'] == 'complete'
        for path, digest in m['pins'].items():
            assert path not in pins or pins[path] == digest
            pins[path] = digest
    for path, digest in pins.items():
        assert sha(ROOT/path) == digest, path
    for p, m in zip([static, subset, points], manifests):
        assert sha(p/'result.json') == m['resultSha256']
    assert sha(static/'retained-kc-apl-edges.jsonl') == manifests[0]['edgesSha256']
    assert sha(subset/'contacts.csv') == manifests[1]['contactsSha256']
    canonical = load(probe/'result.json')
    assert sha(probe/'first-batch.feather') == canonical['sampleSha256']
    source = ROOT/'.cache/flywire-783-locality/synapse_coordinates-generation-1733428450553759.csv.gz'
    receipt = load(Path(str(source)+'.receipt.json'))
    with source.open('rb') as f:
        md5 = hashlib.file_digest(f, 'md5').hexdigest()
    assert source.stat().st_size == receipt['size'] == 316819225
    assert md5 == receipt['actualMd5'] == '9ca493e2314cc03aaf8b03e80f1643e8'
    assert receipt['generation'] == '1733428450553759'
    edges = [json.loads(line) for line in (static/'retained-kc-apl-edges.jsonl').open()]
    expected = {(r['preRoot'], r['postRoot']): r['synapseCount'] for r in edges}
    assert len(edges) == len(expected) == 10343 and sum(expected.values()) == 215419
    roots, ptr, pre, counts, signs = graph_arrays(ROOT/'.cache/full.npz')
    annotations = {}
    with (ROOT/'.cache/flywire-annotations-v2.1.0.tsv').open(encoding='utf-8', newline='') as f:
        for r in csv.DictReader(f, delimiter='\t'):
            if r['cell_class'] == 'Kenyon_Cell' or r['hemibrain_type'] == 'APL':
                assert r['root_id'] not in annotations
                annotations[r['root_id']] = r
    indices = {str(int(root)): i for i, root in enumerate(roots)}
    assert len(indices) == len(roots)
    ai = {indices[r] for r in APL}
    kc = {indices[r] for r, a in annotations.items() if a['cell_class'] == 'Kenyon_Cell' and r in indices}
    relevant = {i for i, neuron in enumerate(pre) if neuron in ai}
    for i in ai:
        relevant.update(range(int(ptr[i]), int(ptr[i+1])))
    graph_pairs = {}
    for e in relevant:
        post = bisect_right(ptr, e)-1
        source_i = int(pre[e])
        if (source_i in ai and post in kc) or (source_i in kc and post in ai):
            pair = str(int(roots[source_i])), str(int(roots[post]))
            assert pair not in graph_pairs
            graph_pairs[pair] = e
    assert set(graph_pairs) == set(expected)
    for r in edges:
        pair = r['preRoot'], r['postRoot']; e = graph_pairs[pair]
        assert e == r['edge'] and int(counts[e]) == r['synapseCount']
        assert int(signs[e]) == r['sign'] == (-1 if pair[0] in APL else 1)
        assert indices[pair[0]] == r['preIndex'] and indices[pair[1]] == r['postIndex']
    aggregate = Counter()
    with gzip.open(ROOT/'.cache/flywire-codex-783-verify/connections.csv.gz', 'rt', newline='', encoding='utf-8-sig') as f:
        for i, r in enumerate(csv.DictReader(f), 1):
            pair = r['pre_root_id'], r['post_root_id']
            if pair in expected:
                aggregate[pair] += int(r['syn_count'])
            if i % 500000 == 0: guard()
    assert aggregate == expected
    # Independent scalar decoding of the pinned prefix, including cross-batch carry.
    scalar = []; last = [None, None]
    with gzip.open(source, 'rt', newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            for j, key in enumerate(FIELDS[:2]):
                if r[key] != '': last[j] = r[key]
                assert last[j] and last[j].isascii() and last[j].isdigit()
                r[key] = last[j]
            scalar.append(tuple(r[k] for k in FIELDS))
            if len(scalar) == 10000: break
    arrow = []
    for b in batches(source, 4096):
        arrow.extend(tuple(r[k] for k in FIELDS) for r in b.to_pylist())
        if len(arrow) >= 10000: break
    assert arrow[:10000] == scalar
    for bad in [None, 'null', '1.0', '１２']:
        try: fill(pa.array([bad], type=pa.string()), None)
        except AssertionError: pass
        else: raise AssertionError(('invalid root accepted', bad))
    a, last = fill(pa.array(['720575940613583001', None]), None)
    b, last = fill(pa.array([None, '720575940624547622', None]), last)
    assert a.to_pylist()+b.to_pylist() == ['720575940613583001']*3+['720575940624547622']*2
    empty, last = fill(pa.array([None, None], type=pa.string()), last)
    assert empty.to_pylist() == ['720575940624547622']*2
    # Audit the complete selected CSV. The separate failed full-source rescan is
    # preserved; this run does not pretend that partial rescan completed.
    observed = Counter(); selected = 0; previous_row = 0
    with (subset/'contacts.csv').open(newline='') as f:
        for r in csv.DictReader(f):
            pair = r['pre_root_id'], r['post_root_id']
            assert pair in expected and all(s.isascii() and s.isdigit() for s in pair)
            row = int(r['source_row']); assert previous_row < row <= 34156320
            previous_row = row
            assert all(Decimal(r[k]).is_finite() for k in 'xyz')
            observed[pair] += 1; selected += 1
            if selected % 50000 == 0: guard()
    assert selected == 215419 and observed == expected
    # Canonical comparison uses decimal arithmetic: no float root or midpoint conversion.
    batch = ipc.open_file(str(probe/'first-batch.feather')).get_batch(0)
    assert batch.num_rows == 65536
    canonical_rows = batch.to_pylist()
    apl_rows = [r for r in canonical_rows if str(r['pre_pt_root_id']) in APL or str(r['post_pt_root_id']) in APL]
    retained = [r for r in apl_rows if (str(r['pre_pt_root_id']), str(r['post_pt_root_id'])) in expected]
    wanted = {(str(r['pre_pt_root_id']), str(r['post_pt_root_id'])) for r in retained}
    lookup = defaultdict(lambda: defaultdict(list))
    with (subset/'contacts.csv').open(newline='') as f:
        for r in csv.DictReader(f):
            pair = r['pre_root_id'], r['post_root_id']
            if pair in wanted: lookup[pair][tuple(Decimal(r[k]) for k in 'xyz')].append(int(r['source_row']))
    old = load(points/'result.json'); audit_records = []
    assert len(apl_rows) == 196 and len(retained) == len(old['records']) == 126 and len(wanted) == 125
    for r, recorded in zip(retained, old['records']):
        pair = str(r['pre_pt_root_id']), str(r['post_pt_root_id'])
        p = tuple(r['pre_pt_position_'+k] for k in 'xyz'); q = tuple(r['post_pt_position_'+k] for k in 'xyz')
        mid = tuple((Decimal(x)+Decimal(y))/2 for x, y in zip(p, q))
        candidates = {'pre': p, 'post': q, 'midpoint': mid}
        matches = {label: lookup[pair].get(coords, []) for label, coords in candidates.items()}
        labels = [label for label, rows in matches.items() if rows]
        assert labels == ['midpoint'] and matches == recorded['matchedSourceRows']
        assert recorded['synapseId'] == str(r['id']) and (recorded['preRoot'], recorded['postRoot']) == pair
        assert recorded['cleftScore'] == r['cleft_score']
        for label, coords in candidates.items():
            assert tuple(Decimal(str(v)) for v in recorded['canonicalPointsNm'][label]) == coords
        distance = math.sqrt(sum((x-y)**2 for x, y in zip(p, q)))
        assert math.isclose(distance, recorded['endpointSeparationNm'], rel_tol=1e-15)
        audit_records.append({'synapseId': str(r['id']), 'matches': labels, 'sourceRows': matches['midpoint']})
    requests = canonical['requests']
    assert len(requests) == 12 and sum(r['bytes'] for r in requests) == canonical['transferredBytes'] == 1770575
    for r in requests:
        assert r['bytes'] == r['end']-r['start']+1
        assert r['headers']['content-range'] == f"bytes {r['start']}-{r['end']}/9492998242"
    assert canonical['fullFileChecksumVerified'] is False
    for path, digest in pins.items(): assert sha(ROOT/path) == digest, ('changed', path)
    guard()
    result = {'schema':'apl-data-prerequisite-independent-audit-v1', 'status':'pass-selected-static-semantic-audit-with-limits', 'auditor':'same-provider native role; standalone independent implementation', 'sourceBytes':source.stat().st_size, 'sourceSha256':sha(source), 'sourceMd5':md5, 'gzipCrcEof':'preserved acquisition receipt only; byte identity freshly verified', 'sourceRowsFromPreservedRun':34156320, 'freshCompleteSourceRescan':False, 'selectedRows':selected, 'allPairs':len(expected), 'allGraphSignsAndWeightsMatch':True, 'aggregateCountsMatch':True, 'selectedRowsMonotonicAndInRange':True, 'scalarPrefixRows':10000, 'allCanonicalSampleRowsRead':65536, 'canonicalAplRows':len(apl_rows), 'retainedCanonicalRows':len(retained), 'midpointOnly':126, 'canonicalRecords':audit_records, 'rangeReceiptArithmeticChecked':True, 'canonicalRangePayloadsRefetched':False, 'fullCanonicalChecksumVerified':False, 'networkRequests':0, 'graphPasses':0, 'learnerUpdates':0, 'limits':{'wallSeconds':180,'rssMiB':2048,'freeMiB':256,'workers':0}, 'resources':RESOURCES, 'elapsedSeconds':time.monotonic()-START, 'limitations':['Fresh full-source rescan hit 180s guard and remains incomplete; no complete independent row-by-row raw-source correspondence claim.', 'Complete canonical source not acquired or hashed; saved derived sample and range-receipt consistency audited only.', 'Global independent forward-fill remains a serialization hypothesis; complete selected-pair counts and exact first-10000-row decoder equivalence pass.', 'Finite midpoint correspondence does not establish full endpoint coordinates, contact-to-skeleton attachment, path distances, local inhibition physiology or memory benefit.']}
    target.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ['resources','canonicalRecords','limitations']}))


if __name__ == '__main__':
    main()
