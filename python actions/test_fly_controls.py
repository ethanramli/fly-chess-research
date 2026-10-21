"""Terminal behavior checks using saved synthetic data, never a research graph."""
import contextlib
import gzip
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import curriculum as api
import fly_controls as controls


class ControlsTests(unittest.TestCase):
    def setUp(self):
        directory = api.ROOT / 'runs/python-actions/control-tests'
        directory.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=directory)
        self.root = Path(self.temp.name)
        self.patcher = patch.object(api, 'ROOT', self.root)
        self.patcher.start()
        self.protocol = {'model': {'seed': 47}, 'projectionSeeds': [1],
                         'conditions': [{'id': 'informative'}, {'id': 'absent'}]}
        self.run = self.root / 'study'
        self.run.mkdir()
        api.atomic_json(self.run / 'protocol.json', self.protocol)
        self.hash = api.digest(self.run / 'protocol.json')
        self.config = {'schema': 1, 'paused': False, 'paths': {'run': 'study', 'protocol': 'study/protocol.json'},
                       'reporting': {'title': 'Test study', 'stages': [{'label': 'Learning', 'lessons': 10}], 'history': []},
                       'pause_control': {'supported_executables': ['worker.mjs']}}
        api.atomic_json(self.root / 'config.json', self.config)
        self.config = api.load_config(self.root / 'config.json')

    def tearDown(self):
        self.patcher.stop()
        self.temp.cleanup()

    def saved(self, pending=False):
        path = self.run / 'checkpoint-000004.json.gz'
        path.write_bytes(gzip.compress(json.dumps({'stage': 0, 'lesson': 3, 'pendingReceipt': None,
            'session': {'pending': {'cursor': 1} if pending else None}, 'results': []}).encode()))
        return path

    def row(self, correct, condition='informative'):
        return {'phase': 'acquisition', 'branch': 'prefix', 'condition': condition,
                'correct': correct, 'contextRows': [{}] * 8}

    def audited(self, path, correct, protocol=None):
        path.mkdir(exist_ok=True)
        api.atomic_json(path / 'protocol.json', protocol or self.protocol)
        api.atomic_json(path / 'result.json', {'identity': {'protocolHash': api.digest(path / 'protocol.json')},
                        'receiptCount': 20, 'stageResults': [self.row(correct), self.row(2, 'absent')]})
        api.atomic_json(path / 'audit.json', {'passed': True, 'fullNeuralReplay': True, 'receipts': 20})

    def output(self):
        stream = io.StringIO()
        with patch.object(api, 'inventory', return_value={'processes': [], 'freeMiB': 2000}), contextlib.redirect_stdout(stream):
            controls.report(self.config, api)
        return stream.getvalue()

    def test_progress_is_work_not_reasoning_and_report_does_not_mutate_state(self):
        path = self.saved()
        before = path.read_bytes()
        text = self.output()
        self.assertIn('30.0%', text)
        self.assertIn('(3/10)', text)
        self.assertIn('not a measure of reasoning', text)
        self.assertIn('Not enough comparable data', text)
        self.assertNotIn('checkpoint', text)
        self.assertEqual(before, path.read_bytes())

    def test_audited_comparable_result_has_exact_percentage_point_delta(self):
        self.audited(self.root / 'previous', 4)
        self.audited(self.run, 5)
        self.config['reporting']['history'] = ['previous']
        text = self.output()
        self.assertIn('Looking positive', text)
        self.assertIn('50.0% -> 62.5%', text)
        self.assertIn('+12.5 percentage points', text)
        self.assertEqual(text, self.output())

    def test_different_seeds_are_not_reported_as_regression(self):
        self.audited(self.root / 'previous', 8, {**self.protocol, 'projectionSeeds': [2]})
        self.audited(self.run, 5)
        self.config['reporting']['history'] = ['previous']
        text = self.output()
        self.assertIn('Not enough comparable data', text)
        self.assertNotIn('Showing regression', text)

    def test_unaudited_results_do_not_get_positive_trend(self):
        self.audited(self.root / 'previous', 4)
        self.audited(self.run, 8)
        (self.run / 'audit.json').unlink()
        self.config['reporting']['history'] = ['previous']
        text = self.output()
        self.assertIn('Preliminary', text)
        self.assertNotIn('Looking positive', text)

    def test_mixed_trend_does_not_hide_a_regression(self):
        self.assertTrue(controls.trend({'a': (70, '%'), 'b': (40, '%')}, {'a': (50, '%'), 'b': (60, '%')}).startswith('Mixed'))
        self.assertEqual(controls.trend({'a': (40, '%')}, {'a': (60, '%')}), 'Showing regression')
        self.assertEqual(controls.trend({'a': (60, '%')}, {'a': (60, '%')}), 'No measured change')

    def pause_marker(self, pending=False):
        saved = self.saved(pending)
        api.atomic_json(self.run / 'paused.json', {'schema': 1, 'phase': 'training', 'run': str(self.run),
            'protocolHash': self.hash, 'checkpoint': str(saved), 'checkpointSha256': api.digest(saved)})
        return saved

    def handle(self):
        handle = {'pid': 3, 'created': 'first', 'command': 'node worker.mjs', 'role': 'train',
                  'run': str(self.run), 'argv': ['node', 'worker.mjs']}
        api.atomic_json(api.state_path(self.config), handle)
        return handle

    def test_pause_confirms_saved_lesson_and_real_process_exit(self):
        self.handle()
        self.pause_marker()
        live = {'processes': [{'pid': 3, 'created': 'first', 'command': 'node worker.mjs', 'name': 'node.exe'}]}
        stream = io.StringIO()
        with patch.object(api, 'inventory', side_effect=[live, {'processes': []}]), contextlib.redirect_stdout(stream):
            self.assertEqual(controls.pause(self.config, api), 0)
        self.assertIn('Safe to close', stream.getvalue())
        self.assertEqual(api.read_json(self.run / 'pause-request.json')['run'], str(self.run))

    def test_pause_never_claims_saved_if_a_lesson_is_incomplete(self):
        self.pause_marker(pending=True)
        with self.assertRaisesRegex(ValueError, 'finish saving'):
            controls.pause_receipt(self.run, api)

    def test_pause_does_not_target_a_reused_pid(self):
        self.handle()
        reused = {'processes': [{'pid': 3, 'created': 'new', 'command': 'node other.mjs', 'name': 'node.exe'}]}
        with patch.object(api, 'inventory', return_value=reused):
            with self.assertRaisesRegex(ValueError, 'verify'):
                controls.pause(self.config, api)
        self.assertFalse((self.run / 'pause-request.json').exists())

    def test_report_follows_resumed_run_instead_of_old_base(self):
        resumed = self.root / 'resumed'
        resumed.mkdir()
        api.atomic_json(resumed / 'protocol.json', self.protocol)
        path = resumed / 'checkpoint-000010.json.gz'
        path.write_bytes(gzip.compress(json.dumps({'stage': 0, 'lesson': 7}).encode()))
        _, campaign = controls.campaign_location(self.config, api)
        api.atomic_json(campaign, {'configHash': self.config['_hash'], 'currentRun': str(resumed)})
        self.assertIn('(7/10)', self.output())


if __name__ == '__main__':
    stream = io.StringIO()
    result = unittest.TextTestRunner(stream=stream).run(unittest.defaultTestLoader.loadTestsFromTestCase(ControlsTests))
    print(json.dumps({'tests': result.testsRun, 'passed': result.testsRun-len(result.errors)-len(result.failures),
                      'failed': len(result.failures), 'errors': len(result.errors), 'scope': 'synthetic report/pause controls only'}))
    if not result.wasSuccessful():
        print(stream.getvalue()[-6000:])
    raise SystemExit(0 if result.wasSuccessful() else 1)
