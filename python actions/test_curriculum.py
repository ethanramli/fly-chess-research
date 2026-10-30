"""Bounded software tests; never load a graph or call a scientific runner."""
import contextlib
import gzip
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import threading
import time
import unittest
from unittest.mock import patch
from uuid import uuid4

spec = importlib.util.spec_from_file_location("curriculum", Path(__file__).with_name("curriculum.py"))
actions = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = actions
spec.loader.exec_module(actions)


class ActionTests(unittest.TestCase):
    def test_campaign_status_reports_missing_campaign_without_legacy_g0_fields(self):
        missing = actions.curriculum_status(self.root / "missing-campaign.json")
        self.assertEqual(missing["state"], "not_registered")
        self.assertEqual(missing["totalStages"], 12)
        self.assertNotIn("G0Passed", missing)

    def test_campaign_status_reports_registered_progress_and_identity(self):
        registration_path = self.root / "campaign.json"
        registration = {"schema": 1, "paused": False,
                        "stages": [{"stage": stage} for stage in range(1, 13)]}
        registration_path.write_text(json.dumps(registration), encoding="utf-8")
        ready = actions.curriculum_status(registration_path)
        self.assertEqual(ready["state"], "ready_to_start")
        self.assertEqual(ready["acceptedStages"], 0)
        campaign_id = hashlib.sha256(str(registration_path.resolve()).encode()).hexdigest()[:16]
        state_path = self.root / f"runs/python-actions/curriculum-campaign-{campaign_id}.json"
        state_path.parent.mkdir(parents=True)
        actions.atomic_json(state_path, {"schema": 1, "registrationSha256": actions.digest(registration_path),
                                         "stage": 3, "terminal": "gate-failed",
                                         "stages": [{"stage": 1, "status": "accepted"},
                                                     {"stage": 2, "status": "accepted"},
                                                     {"stage": 3, "status": "gate-failed"}]})
        stopped = actions.curriculum_status(registration_path)
        self.assertEqual(stopped["state"], "gate_failed")
        self.assertEqual(stopped["acceptedStages"], 2)
        self.assertEqual(stopped["stage"], 3)

    def test_campaign_checks_all_named_memory_lineages(self):
        initial = {"r1:informative": "a" * 64, "r1:absent": "b" * 64,
                   "r2:informative": "c" * 64}
        final = {key: chr(ord(value[0]) + 1) * 64 for key, value in initial.items()}
        result = {"initialMemoryHashes": initial, "finalMemoryHashes": final}
        audit = {"initialMemoryHashes": dict(initial), "finalMemoryHashes": dict(final)}
        checked = actions._campaign_memory_state(result, audit, initial)
        self.assertFalse(checked["unknown"])
        self.assertFalse(checked["mismatch"])
        self.assertEqual(checked["final"], final)

    def test_campaign_rejects_partial_or_changed_memory_lineage(self):
        initial = {"r1:informative": "a" * 64, "r1:disabled": "b" * 64}
        final = {"r1:informative": "c" * 64, "r1:disabled": "d" * 64}
        result = {"initialMemoryHashes": initial, "finalMemoryHashes": final}
        audit = {"initialMemoryHashes": dict(initial), "finalMemoryHashes": {"r1:informative": "c" * 64}}
        self.assertTrue(actions._campaign_memory_state(result, audit, initial)["unknown"])
        audit["finalMemoryHashes"] = dict(final)
        previous = dict(initial)
        previous["r1:disabled"] = "e" * 64
        checked = actions._campaign_memory_state(result, audit, previous)
        self.assertFalse(checked["unknown"])
        self.assertTrue(checked["mismatch"])

    def test_campaign_keeps_single_memory_hash_compatibility(self):
        initial, final = "a" * 64, "b" * 64
        checked = actions._campaign_memory_state(
            {"initialMemorySha256": initial, "finalMemorySha256": final},
            {"initialMemorySha256": initial, "finalMemorySha256": final}, initial)
        self.assertFalse(checked["unknown"])
        self.assertFalse(checked["mismatch"])

    @unittest.skipUnless(os.name == "nt", "Windows process inspection")
    def test_native_command_reads_owned_process_and_preserves_unknowns(self):
        command = actions.process_command(os.getpid())
        self.assertIsInstance(command, str)
        # A venv launcher can redirect to the base executable; the actual script
        # argument still identifies this owned test process.
        self.assertEqual(Path(actions.windows_argv(command)[-1]).resolve(), Path(__file__).resolve())
        self.assertIsNone(actions.process_command(0))
        self.assertIsNone(actions.process_command(-1))

    def test_known_nonexperiment_node_is_allowed_but_unknown_stays_blocked(self):
        self.config["paused"] = False
        self.save()
        row = {"pid": 456, "name": "node.exe", "command": "node tooling-service.mjs"}
        self.assertTrue(actions.plan(self.loaded, "train", {"freeMiB": 1000, "processes": [row]})["ready"])
        row["command"] = None
        self.assertFalse(actions.plan(self.loaded, "train", {"freeMiB": 1000, "processes": [row]})["ready"])

    def test_check_callback_preserves_child_receipt_before_waiting(self):
        seen = []
        def started(handle):
            saved = actions.read_json(Path(handle['stdout']).parent / 'handle.json')
            self.assertEqual(saved['pid'], handle['pid'])
            self.assertIsNone(saved['exitCode'])
            seen.append(handle['pid'])
        result = actions.execute(self.loaded, 'check', foreground=True, on_started=started)
        self.assertEqual(result['exitCode'], 7)
        self.assertEqual(len(seen), 1)

    def setUp(self):
        directory = Path(__file__).resolve().parent.parent / 'runs/python-actions/action-tests'
        directory.mkdir(parents=True, exist_ok=True)
        # Python 3.14's mkdtemp uses a private Windows DACL; inherited workspace
        # permissions keep these fixtures accessible under the managed token.
        self.root = directory / f'fly-actions-{uuid4().hex}'
        self.root.mkdir()
        self.root_patch = patch.object(actions, "ROOT", self.root)
        self.root_patch.start()
        (self.root / "protocol.json").write_text('{"fixture":true}')
        (self.root / "child file.py").write_text("import sys; print('x'*100000); print('expected failure',file=sys.stderr); sys.exit(7)")
        self.config = {
            "schema": 1, "paused": True,
            "paths": {"protocol": "protocol.json", "run": "new", "checkpoint": "saved.json.gz"},
            "pins": {"{protocol}": actions.digest(self.root / "protocol.json")},
            "jobs": {
                "train": {"role": "train", "argv": ["node", "--max-old-space-size=256", "dummy.mjs", "--out", "{run}", "--cpu-duty", "0.5"], "fresh_output": "{run}"},
                "check": {"role": "check", "argv": [sys.executable, "child file.py"]},
            },
            "artifacts": {"result": "{run}/result.json"},
            "observe": {"job": "train", "expected": ["dummy.mjs", "{run}"], "stdout": "stdout.txt", "stderr": "stderr.txt"},
        }
        self.path = self.root / "config.json"
        self.save()
        self.empty = {"freeMiB": 1000, "processes": []}

    def save(self):
        self.path.write_text(json.dumps(self.config), encoding="utf-8")
        self.loaded = actions.load_config(self.path)

    def tearDown(self):
        self.root_patch.stop()
        directory = Path(__file__).resolve().parent.parent / 'runs/python-actions/action-tests'
        assert self.root.resolve().is_relative_to(directory.resolve())
        shutil.rmtree(self.root)

    def test_launch_guards_and_no_implicit_resume(self):
        plan = actions.plan(self.loaded, "train", self.empty)
        self.assertFalse(plan["ready"])
        self.assertIn("research paused", plan["blockers"][0])
        self.assertFalse((self.root / "new").exists())
        self.config["paused"] = False
        self.save()
        self.assertTrue(actions.plan(self.loaded, "train", self.empty)["ready"])
        busy = {"freeMiB": 200, "processes": [{"pid": 123, "name": "node.exe", "command": "node .codebase/scripts/run.mjs"}]}
        self.assertEqual(len(actions.plan(self.loaded, "train", busy)["blockers"]), 2)
        unknown = {"freeMiB": 1000, "processes": [{"pid": 456, "name": "node.exe", "command": None}]}
        self.assertFalse(actions.plan(self.loaded, "train", unknown)["ready"])
        (self.root / "new").mkdir()
        self.assertIn("output must be a new directory", actions.plan(self.loaded, "train", self.empty)["blockers"])
        (self.root / "protocol.json").write_text('{}')
        self.assertIn("pin mismatch", str(actions.plan(self.loaded, "train", self.empty)["blockers"]))

    def test_required_pacing_and_partial_checkpoint(self):
        self.config["paused"] = False
        self.config["jobs"]["train"]["argv"][-1] = "1.0"
        self.save()
        self.assertIn("required heap/duty flags", str(actions.plan(self.loaded, "train", self.empty)["blockers"]))
        self.config["jobs"]["train"]["argv"][-1] = "0.75"
        self.save()
        self.assertNotIn("required heap/duty flags", str(actions.plan(self.loaded, "train", self.empty)["blockers"]))
        with self.assertRaisesRegex(ValueError, "Partial"):
            actions.checkpoint(self.root / "checkpoint-123.json.gz.partial")

    def test_guarded_auditor_outside_standard_folders_blocks_launch(self):
        self.config['paused'] = False
        self.save()
        command = 'node --max-old-space-size=256 research/data/custom/audit.mjs run --cpu-duty 0.5'
        live = {'freeMiB': 1024, 'processes': [{'pid': 123, 'name': 'node.exe', 'command': command}]}
        self.assertTrue(actions.GRAPH_COMMAND.search(command))
        self.assertIn('live or unknown experiment process: PID123', actions.plan(self.loaded, 'train', live)['blockers'])

    def test_checkpoint_pending_and_latest_preserve_bytes(self):
        record = {"sequence": 9, "receiptCount": 3, "pendingReceipt": {"sequence": 3}, "identity": {"protocolHash": "abc"}}
        complete = self.root / "checkpoint-000009.json.gz"
        complete.write_bytes(gzip.compress(json.dumps(record).encode()))
        before = complete.read_bytes()
        (self.root / "checkpoint-999999.json.gz.partial").write_bytes(b'bad')
        self.assertEqual(actions.latest_checkpoint(self.root), complete)
        brief = actions.checkpoint(complete)
        self.assertTrue(brief["pendingReceipt"])
        self.assertEqual(brief["protocolHash"], "abc")
        self.assertEqual(complete.read_bytes(), before)

    def test_log_and_artifact_output_is_bounded(self):
        log = self.root / "stdout.txt"
        log.write_text('x'*200000 + '\n{"auditProgress":true,"receipts":500}\npartial {\n')
        self.assertEqual(actions.progress(log)["receipts"], 500)
        log.write_text('x'*200000 + '\n{"auditProgress":true,"receipts":500}\n'
                       '{"event":"lineage-complete","stage":1,"condition":"informative",'
                       '"completedLineages":1,"totalLineages":6}\npartial {\n')
        self.assertEqual(actions.progress(log), {"stage": 1, "condition": "informative",
            "event": "lineage-complete", "completedLineages": 1, "totalLineages": 6})
        artifact = self.root / "result.json"
        artifact.write_text('{"passed":false,"memories":[1,2,3]}')
        brief = actions.artifact(artifact, ["passed"])
        self.assertEqual(brief["summary"], {"passed": False})
        artifact.write_text('{"passed":')
        self.assertEqual(actions.artifact(artifact, ["passed"])["state"], "invalid")

    def test_pid_reuse_and_command_change_are_unknown_not_success(self):
        handle = {"pid": 11, "created": "first", "command": "node actual"}
        row = {"pid": 11, "created": "second", "command": "node actual"}
        self.assertEqual(actions.matching_process(handle, {"processes": [row]})[0], "identity_mismatch")
        self.assertEqual(actions.matching_process(handle, self.empty)[0], "missing")
        handle["created"] = None
        self.assertEqual(actions.matching_process(handle, {"processes": [row]})[0], "unknown")

    def test_attach_checks_exact_arguments_and_preserves_process(self):
        for file in ("stdout.txt", "stderr.txt"):
            (self.root / file).touch()
        argv = actions.resolve_command(self.loaded, self.loaded['jobs']['train'])
        row = {"pid": 77, "created": "first", "command": subprocess.list2cmdline([part if part != 'new' else 'new2' for part in argv])}
        with patch.object(actions, "inventory", return_value={"processes": [row]}):
            with self.assertRaisesRegex(ValueError, "identity differs"):
                actions.attach(self.loaded, "train", 77)
            row["command"] = subprocess.list2cmdline(argv)
            self.assertEqual(actions.attach(self.loaded, "train", 77)["pid"], 77)
        self.assertEqual(actions.read_json(actions.state_path(self.loaded))["created"], "first")

    def test_failed_check_keeps_logs_exit_code_and_graph_handle(self):
        state = actions.state_path(self.loaded)
        actions.atomic_json(state, {"existing": "graph handle"})
        result = actions.execute(self.loaded, "check", foreground=True)
        self.assertEqual(result["exitCode"], 7)
        self.assertIn("expected failure", result["errorTail"])
        self.assertGreater(Path(result["logs"]["stdout"]).stat().st_size, 90000)
        self.assertLess(len(json.dumps(result)), 2000)
        self.assertEqual(actions.read_json(state), {"existing": "graph handle"})
        self.assertFalse(state.with_suffix('.launch-lock').exists())

    def test_refused_launch_cleans_own_lock_but_preserves_foreign_lock(self):
        with patch.object(actions, "inventory", return_value=self.empty):
            with self.assertRaisesRegex(ValueError, "paused"):
                actions.execute(self.loaded, "train")
        lock = actions.state_path(self.loaded).with_suffix('.launch-lock')
        self.assertFalse(lock.exists())
        lock.write_text('other invocation')
        with self.assertRaises(FileExistsError):
            actions.execute(self.loaded, "check", foreground=True)
        self.assertEqual(lock.read_text(), 'other invocation')

    def test_watch_only_reports_changes_and_never_restarts(self):
        stream = io.StringIO()
        samples = [{"state": "live", "progress": {"receipts": 1}}, {"state": "live", "progress": {"receipts": 1}}, {"state": "missing"}]
        with patch.object(actions, "status", side_effect=samples), patch.object(actions.time, "sleep"), contextlib.redirect_stdout(stream):
            actions.watch(self.loaded, 1, 1)
        self.assertEqual(len(stream.getvalue().splitlines()), 2)
        with self.assertRaises(ValueError):
            actions.watch(self.loaded, 61, 1)

    def test_audit_requires_existing_result_and_preserves_audit(self):
        self.config['paths']['run'] = 'old'
        self.config["jobs"]["audit"] = {"role": "audit", "argv": ["node", "--max-old-space-size=256", "audit.mjs", "old", "--cpu-duty", "0.5"], "requires": ["{run}/result.json"], "refuse_existing": ["{run}/audit.json"]}
        self.config["paused"] = False
        self.save()
        self.assertIn("missing input", str(actions.plan(self.loaded, "audit", self.empty)["blockers"]))
        (self.root / "old").mkdir()
        (self.root / "old/result.json").write_text('{}')
        (self.root / "old/audit.json").write_text('{"passed":false}')
        (self.root / "old/protocol.json").write_text('{"changed":true}')
        blockers = actions.plan(self.loaded, "audit", self.empty)["blockers"]
        self.assertIn("preserve existing artifact", str(blockers))
        self.assertIn("run protocol mismatch", blockers)

    def test_launch_refuses_to_report_parent_run_as_new_output(self):
        self.config['jobs']['train']['fresh_output'] = 'different-run'
        self.config['paused'] = False
        self.save()
        self.assertIn('fresh_output must match', str(actions.plan(self.loaded,'train',self.empty)['blockers']))

    def test_status_uses_recorded_run_and_silent_checkpoint(self):
        for name in ('stdout.txt','stderr.txt'):
            (self.root/name).touch()
        (self.root/'new').mkdir()
        saved = {'sequence':42,'receiptCount':20,'pendingReceipt':{'sequence':20}}
        (self.root/'new/checkpoint-000042.json.gz').write_bytes(gzip.compress(json.dumps(saved).encode()))
        row = {'pid':77,'created':'first','command':'exact','cpuSeconds':2,'workingSetMiB':32}
        handle = {'job':'train','role':'train','pid':77,'created':'first','command':'exact','run':str(self.root/'new'),'configHash':self.loaded['_hash'],
                  'stdout':str(self.root/'stdout.txt'),'stderr':str(self.root/'stderr.txt'),'artifacts':{'result':str(self.root/'new/result.json')}}
        actions.atomic_json(actions.state_path(self.loaded),handle)
        self.loaded['_hash']='changed'
        self.loaded['paths']['run']='other-run'
        with patch.object(actions,'inventory',return_value={'freeMiB':1000,'processes':[row]}):
            result = actions.status(self.loaded)
        self.assertEqual(result['state'],'live')
        self.assertTrue(result['configChanged'])
        self.assertEqual(result['checkpoint']['sequence'],42)
        self.assertTrue(result['checkpoint']['pendingReceipt'])
        self.assertFalse(result['artifacts']['result'])

    def test_status_uses_registered_rss_ceiling_without_changing_frozen_default(self):
        (self.root / 'stdout.txt').touch();(self.root / 'stderr.txt').touch()
        run = self.root / 'new';run.mkdir()
        self.config['resourceLimits'] = {'rssMiB': 2048, 'freeMiB': 256}
        self.save()
        handle = {'job':'train','role':'train','pid':77,'created':'first','command':'exact',
            'run':str(run),'configHash':self.loaded['_hash'],'stdout':str(self.root/'stdout.txt'),
            'stderr':str(self.root/'stderr.txt'),'artifacts':{}}
        actions.atomic_json(actions.state_path(self.loaded),handle)
        row = {'pid':77,'created':'first','command':'exact','cpuSeconds':1,'workingSetMiB':900}
        with patch.object(actions,'inventory',return_value={'freeMiB':1000,'processes':[row]}):
            result=actions.status(self.loaded)
        self.assertEqual(result['resourceLimits']['rssMiB'],2048)
        self.assertFalse(result['resourceGuardExceeded'])
        self.config['resourceLimits'] = {'rssMiB':768, 'freeMiB':256}
        self.save();handle['configHash']=self.loaded['_hash'];actions.atomic_json(actions.state_path(self.loaded),handle)
        with patch.object(actions,'inventory',return_value={'freeMiB':1000,'processes':[row]}):
            result=actions.status(self.loaded)
        self.assertEqual(result['resourceLimits']['rssMiB'],768)
        self.assertTrue(result['resourceGuardExceeded'])

    def test_untracked_and_observation_expiry_never_infer_exit(self):
        with patch.object(actions,'inventory',return_value=self.empty):
            result=actions.status(self.loaded)
        self.assertEqual(result['state'],'untracked')
        self.assertEqual(result['observedProcessState'],'missing')
        stream=io.StringIO()
        with patch.object(actions,'status',return_value={'state':'live'}), patch.object(actions.time,'monotonic',side_effect=[0,1]), contextlib.redirect_stdout(stream):
            actions.watch(self.loaded,1,1)
        end=json.loads(stream.getvalue().splitlines()[-1])
        self.assertTrue(end['observationWindowEnded'])
        self.assertEqual(end['processState'],'live')

    def test_resume_rejects_protocol_mismatch_without_mutating_checkpoint(self):
        self.config['paused']=False
        self.config['jobs']['resume']={**self.config['jobs']['train'],'role':'resume'}
        self.save()
        saved=self.root/'saved.json.gz'
        saved.write_bytes(gzip.compress(json.dumps({'identity':{'protocolHash':'wrong'},'pendingReceipt':{'sequence':1}}).encode()))
        before=saved.read_bytes()
        result=actions.plan(self.loaded,'resume',self.empty)
        self.assertIn('checkpoint protocol mismatch',result['blockers'])
        self.assertEqual(before,saved.read_bytes())

    def test_matrix_resume_requires_state_checkpoint_and_exact_protocol(self):
        self.config['paused'] = False
        prior = self.root / 'runs/previous'
        attempt = prior / 'replica-informative/attempt-001'
        attempt.mkdir(parents=True)
        (attempt / 'stage-checkpoint-000.json.gz').write_bytes(b'complete fixture publication')
        state_path = prior / 'matrix-state.json'
        actions.atomic_json(state_path, {'schema': 'lichess-curriculum-matrix-state-v1', 'status': 'running',
            'completed': {}, 'plans': {}, 'active': {'attempt': str(attempt)}})
        self.config['recovery'] = {'kind': 'lichess-stage-matrix-v1'}
        self.config['resourceLimits'] = {'rssMiB': 2048, 'freeMiB': 256}
        self.config['paths']['resume_state'] = str(state_path)
        self.config['jobs']['resume'] = {'role': 'resume', 'argv': ['node', '--max-old-space-size=256',
            'matrix.mjs', '--out', '{run}', '--resume-state', '{resume_state}', '--protocol',
            str(self.root / 'protocol.json'), '--cpu-duty', '0.5'], 'fresh_output': '{run}'}
        self.save()
        planned = actions.plan(self.loaded, 'resume', self.empty)
        self.assertTrue(planned['ready'], planned['blockers'])
        (attempt / 'stage-checkpoint-000.json.gz').unlink()
        planned = actions.plan(self.loaded, 'resume', self.empty)
        self.assertIn('matrix active lineage has no complete stage checkpoint; refusing a fresh restart',
                      planned['blockers'])
        self.assertTrue(state_path.is_file())

    def test_matrix_babysit_passes_prior_state_to_fresh_resume_run(self):
        source, _ = self._babysit_fixture()
        attempt = source / 'replica-informative/attempt-001'
        attempt.mkdir(parents=True)
        (attempt / 'stage-checkpoint-000.json.gz').write_bytes(b'complete fixture publication')
        state_path = source / 'matrix-state.json'
        actions.atomic_json(state_path, {'schema': 'lichess-curriculum-matrix-state-v1', 'status': 'running',
            'completed': {}, 'plans': {}, 'active': {'attempt': str(attempt)}})
        self.config['recovery'] = {'kind': 'lichess-stage-matrix-v1'}
        self.config['paths']['resume_state'] = ''
        self.config['jobs']['resume']['argv'] = ['node', '--max-old-space-size=256', 'matrix.mjs',
            '--out', '{run}', '--resume-state', '{resume_state}', '--protocol',
            str(self.root / 'protocol.json'), '--cpu-duty', '0.5']
        self.save()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        seen_resume_state = []
        def capture(config, name, foreground=False):
            if name == 'resume':
                seen_resume_state.append(config['paths'].get('resume_state'))
            return execute(config, name, foreground)
        with patch.object(actions, 'plan', side_effect=plan), patch.object(actions, 'execute', side_effect=capture), \
             patch.object(actions, 'status', side_effect=status), patch.object(actions, 'reports', return_value={'audit': {'state': 'published'}}), \
             contextlib.redirect_stdout(io.StringIO()):
            result = actions.supervise(self.loaded, 'train', 'audit', 10)
        self.assertEqual(result, 0)
        self.assertEqual(seen_resume_state, [str(state_path)])
        self.assertEqual([row[0] for row in launches], ['resume', 'audit'])
        self.assertEqual(Path(launches[0][1]), source.with_name('seed-run-resume-0001'))

    def test_process_query_failure_is_unknown(self):
        failed = subprocess.CompletedProcess([], 1, '', 'permission denied')
        with patch.object(actions.subprocess, "run", return_value=failed):
            with self.assertRaisesRegex(RuntimeError, "state unknown"):
                actions.inventory()

    def _babysit_fixture(self):
        # Lock ownership is process-scoped; these fixtures have no live processes.
        inventory = patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": []})
        inventory.start()
        self.addCleanup(inventory.stop)
        self.config["paused"] = False
        self.config["paths"].update({"run": "runs/seed-run", "checkpoint": "missing.json.gz"})
        self.config["jobs"] = {
            "train": {"role": "train", "argv": ["node", "--max-old-space-size=256", "dummy.mjs", "--out", "{run}", "--cpu-duty", "0.5"], "fresh_output": "{run}"},
            "resume": {"role": "resume", "argv": ["node", "--max-old-space-size=256", "dummy.mjs", "--out", "{run}", "--resume", "{checkpoint}", "--cpu-duty", "0.5"], "fresh_output": "{run}"},
            "audit": {"role": "audit", "argv": ["node", "--max-old-space-size=256", "audit.mjs", "{run}", "--cpu-duty", "0.5"], "requires": ["{run}/result.json"], "refuse_existing": ["{run}/audit.json"]},
        }
        self.config["artifacts"] = {"result": "{run}/result.json", "audit": "{run}/audit.json"}
        self.config["state_file"] = "runs/python-actions/current.json"
        self.save()
        source = self.root / "runs/seed-run"
        source.mkdir(parents=True)
        shutil.copyfile(self.root / "protocol.json", source / "protocol.json")
        first = source / "checkpoint-000003.json.gz"
        first.write_bytes(gzip.compress(json.dumps({"sequence": 3, "receiptCount": 1,
                                                    "pendingReceipt": {"sequence": 1},
                                                    "identity": {"protocolHash": actions.digest(self.root / "protocol.json")}}).encode()))
        return source, first

    def _mock_babysit_actions(self, resume_complete):
        launches, plans = [], []
        def plan(config, name, live=None):
            plans.append((name, config["paths"]["run"], config["paths"].get("checkpoint")))
            return {"ready": True, "blockers": []}
        def execute(config, name, foreground=False):
            run = actions.local(config["paths"]["run"])
            run.mkdir(parents=True, exist_ok=True)
            protocol_source = actions.local(config["paths"]["protocol"])
            if not (run / "protocol.json").exists():
                shutil.copyfile(protocol_source, run / "protocol.json")
            launches.append((name, str(run), config["paths"].get("checkpoint")))
            actions.atomic_json(actions.state_path(config), {"job": name, "run": str(run), "configHash": config["_hash"],
                                                             "pid": 1, "argv": ["node", "dummy.mjs"]})
            resume_attempts = sum(1 for job, _, _ in launches if job == "resume")
            if name == "train" or (name == "resume" and resume_complete(resume_attempts)):
                (run / "result.json").write_text('{"passed":true}')
            if name == "audit":
                (run / "audit.json").write_text('{"passed":true}')
            return {"started": name, "pid": 1, "stateFile": str(actions.state_path(config)), "logs": {}}
        def status(config):
            handle = actions.read_json(actions.state_path(config))
            return {"state": "missing", "job": handle["job"], "configChanged": False,
                    "resourceGuardExceeded": False, "progress": None, "checkpoint": None,
                    "stderrBytes": 0, "artifacts": {}}
        return launches, plans, plan, execute, status

    def test_babysit_rerun_uses_latest_complete_checkpoint_and_fresh_run(self):
        source, first = self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        stream = io.StringIO()
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=status), patch.object(actions, "reports", return_value={"audit": {"state": "published"}}), \
             contextlib.redirect_stdout(stream):
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        resumed = next(row for row in launches if row[0] == "resume")
        self.assertEqual(Path(resumed[2]), first)
        self.assertEqual(Path(resumed[1]), source.with_name("seed-run-resume-0001"))
        self.assertEqual([row[0] for row in launches], ["resume", "audit"])
        self.assertIn('"checkpoint":"audit_published"', stream.getvalue())

    def test_babysit_second_invocation_advances_to_newest_published_checkpoint(self):
        source, first = self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: attempt > 1)
        stream = io.StringIO()
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=status), contextlib.redirect_stdout(stream):
            first_result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(first_result, 2)
        resumed_once = source.with_name("seed-run-resume-0001")
        later = resumed_once / "checkpoint-000004.json.gz"
        later.write_bytes(gzip.compress(json.dumps({"sequence": 4, "receiptCount": 2,
                                                    "pendingReceipt": {"sequence": 2},
                                                    "identity": {"protocolHash": actions.digest(self.root / "protocol.json")}}).encode()))
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=status), patch.object(actions, "reports", return_value={"audit": {"state": "published"}}), \
             contextlib.redirect_stdout(io.StringIO()):
            second_result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(second_result, 0)
        resumes = [row for row in launches if row[0] == "resume"]
        self.assertEqual([Path(row[2]) for row in resumes], [first, later])
        self.assertEqual([Path(row[1]).name for row in resumes], ["seed-run-resume-0001", "seed-run-resume-0002"])
        self.assertEqual(launches[-1][0], "audit")

    def test_babysit_does_not_start_audit_after_pause_request(self):
        self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        def pause_after_training(config, name, foreground=False):
            result = execute(config, name, foreground)
            if name == 'resume':
                run = actions.local(config['paths']['run'])
                actions.atomic_json(run / 'pause-request.json', {'schema': 1, 'run': str(run),
                    'protocolHash': actions.digest(run / 'protocol.json')})
            return result
        with patch.object(actions, 'plan', side_effect=plan), patch.object(actions, 'execute', side_effect=pause_after_training), \
             patch.object(actions, 'status', side_effect=status), contextlib.redirect_stdout(io.StringIO()):
            result = actions.supervise(self.loaded, 'train', 'audit', 10)
        self.assertEqual(result, 0)
        self.assertEqual([row[0] for row in launches], ['resume'])
        run = Path(launches[0][1])
        self.assertEqual(actions.fly_controls.pause_receipt(run, actions)['phase'], 'between-jobs')

    def test_babysit_terminal_stage_result_skips_audit_on_fresh_and_resumed_paths(self):
        self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        def terminal_result(config, name, foreground=False):
            result = execute(config, name, foreground)
            if name in ('train', 'resume'):
                actions.atomic_json(actions.local(config['paths']['run']) / 'result.json', {
                    'status': 'readiness-blocked', 'reason': 'fixture prerequisite unavailable'})
            return result
        options = dict(terminal_result_statuses=('readiness-blocked', 'gate-failed', 'unknown'),
                       required_result_status='training-complete')
        with patch.object(actions, 'plan', side_effect=plan), patch.object(actions, 'execute', side_effect=terminal_result), \
             patch.object(actions, 'status', side_effect=status), contextlib.redirect_stdout(io.StringIO()):
            first = actions.supervise(self.loaded, 'train', 'audit', 10, **options)
        self.assertEqual(first, 3)
        self.assertEqual([row[0] for row in launches], ['resume'])
        run = Path(launches[0][1])
        self.assertEqual(actions.read_json(run / 'result.json')['status'], 'readiness-blocked')
        with contextlib.redirect_stdout(io.StringIO()):
            resumed = actions.supervise(self.loaded, 'train', 'audit', 10, **options)
        self.assertEqual(resumed, 3)
        self.assertEqual([row[0] for row in launches], ['resume'])

    def _step_lock(self):
        config_id, _ = actions.fly_controls.campaign_location(self.loaded, actions)
        return self.root / f"runs/python-actions/babysit-{config_id}.lock"

    def test_two_concurrent_babysits_exactly_one_enters_supervisor(self):
        # Adapted from research/reports/codebase-weakness-review-2026-10-30/verify-supervisor.py (W06).
        # Both callers pass the inventory point before either publishes the lock.
        lock = self._step_lock()
        claimed = threading.Barrier(2)
        refused = threading.Event()  # the winner keeps its lock until the loser has been refused
        entries, results = [], []
        def inventory_after_both_arrive():
            claimed.wait(timeout=5)
            return {"freeMiB": 1000, "processes": [{"pid": os.getpid(), "created": "test-start", "command": None}]}
        def body(*args, **kwargs):
            entries.append(threading.current_thread().name)
            refused.wait(timeout=5)
            return 0
        def invoke():
            results.append(actions.supervise(self.loaded, "train", "audit", 10))
            if results[-1] == 2:
                refused.set()
        with patch.object(actions, "inventory", side_effect=inventory_after_both_arrive), \
             patch.object(actions, "_supervise", side_effect=body), contextlib.redirect_stdout(io.StringIO()) as out:
            threads = [threading.Thread(target=invoke, name=f"babysit-{i}") for i in range(2)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=10)
        self.assertFalse(any(thread.is_alive() for thread in threads))
        self.assertEqual(len(entries), 1)
        self.assertEqual(sorted(results), [0, 2])
        self.assertIn("another babysit is already supervising", out.getvalue())
        self.assertFalse(lock.exists())

    def test_stale_lock_with_dead_pid_is_replaced_and_run_proceeds(self):
        lock = self._step_lock()
        actions.atomic_json(lock, {"pid": 4242, "created": "old", "token": "dead"})
        seen = []
        def body(*args, **kwargs):
            seen.append(actions.read_json(lock))
            return 0
        with patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": []}), \
             patch.object(actions, "_supervise", side_effect=body), contextlib.redirect_stdout(io.StringIO()):
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertEqual(seen[0]["pid"], os.getpid())
        self.assertNotEqual(seen[0]["token"], "dead")
        self.assertFalse(lock.exists())

    def test_corrupt_lock_is_replaced_with_warning(self):
        lock = self._step_lock()
        lock.parent.mkdir(parents=True, exist_ok=True)
        lock.write_bytes(b"{not json")
        with patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": []}), \
             patch.object(actions, "_supervise", return_value=0), contextlib.redirect_stdout(io.StringIO()) as out:
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertIn("babysit lock is corrupt", out.getvalue())
        self.assertIn(lock.name, out.getvalue())
        self.assertFalse(lock.exists())

    def test_release_keeps_lock_whose_token_differs(self):
        lock = self._step_lock()
        def taken_over(*args, **kwargs):
            actions.atomic_json(lock, {"pid": os.getpid(), "created": None, "token": "takeover"})
            return 0
        with patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": []}), \
             patch.object(actions, "_supervise", side_effect=taken_over), contextlib.redirect_stdout(io.StringIO()):
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertEqual(actions.read_json(lock)["token"], "takeover")

    def _write_campaign(self, source):
        _, campaign_file = actions.fly_controls.campaign_location(self.loaded, actions)
        actions.atomic_json(campaign_file, {"schema": 1, "configHash": self.loaded["_hash"],
                                            "protocolHash": actions.digest(self.root / "protocol.json"),
                                            "baseRun": str(actions.local("runs/seed-run")), "currentRun": str(source),
                                            "sourceRun": str(source), "resumeCount": 0,
                                            "trainJob": "train", "auditJob": "audit", "phase": "training"})

    def _write_tracked_handle(self, source, job="resume", role="resume", pid=77):
        # A real invocation directory supplies the exact runtime config for adoption.
        invocation = self.root / "runs/python-actions/tracked-invocation"
        invocation.mkdir(parents=True, exist_ok=True)
        # Like runtime_config, the saved runtime config records an absolute run path.
        runtime = {**self.config, "paths": {**self.config["paths"], "run": str(actions.local("runs/seed-run"))}}
        (invocation / "config.json").write_text(json.dumps(runtime), encoding="utf-8")
        handle = {"job": job, "role": role, "run": str(actions.local("runs/seed-run")), "pid": pid,
                  "created": "started", "command": "dummy", "configHash": self.loaded["_hash"],
                  "stdout": str(invocation / "stdout.txt"), "stderr": str(invocation / "stderr.txt"),
                  "argv": ["node", "dummy.mjs"], "exitCode": None, "artifacts": {"result": str(source / "result.json")}}
        actions.atomic_json(actions.state_path(self.loaded), handle)
        return handle

    def test_babysit_lock_blocks_live_owner_and_releases_own_lock(self):
        self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        config_id, _ = actions.fly_controls.campaign_location(self.loaded, actions)
        lock = self.root / f"runs/python-actions/babysit-{config_id}.lock"
        actions.atomic_json(lock, {"pid": 4242, "created": "owner"})
        with patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": [{"pid": 4242, "created": "owner"}]}), \
             patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute) as launch, \
             contextlib.redirect_stdout(io.StringIO()) as out:
            blocked = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(blocked, 2)
        self.assertIn("another babysit is already supervising", out.getvalue())
        launch.assert_not_called()
        self.assertEqual(actions.read_json(lock)["pid"], 4242)  # another babysit's lock is untouched
        with patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": []}), \
             patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=status), patch.object(actions, "reports", return_value={"audit": {"state": "published"}}), \
             contextlib.redirect_stdout(io.StringIO()):
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertEqual([row[0] for row in launches], ["resume", "audit"])
        self.assertFalse(lock.exists())

    def test_babysit_adopts_live_tracked_job_without_relaunch(self):
        source, _ = self._babysit_fixture()
        self._write_campaign(source)
        self._write_tracked_handle(source)
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        calls = []
        def live_then_done(config):
            calls.append(config["paths"]["run"])
            if len(calls) <= 2:
                return {"state": "live", "job": "resume", "configChanged": False, "resourceGuardExceeded": False,
                        "progress": None, "checkpoint": None, "stderrBytes": 0, "artifacts": {}}
            (source / "result.json").write_text('{"passed":true}')
            return status(config)
        stream = io.StringIO()
        with patch.object(actions, "inventory", return_value={"freeMiB": 1000, "processes": [
                {"pid": 77, "created": "started", "command": "dummy"}]}), \
             patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=live_then_done), patch.object(actions, "wait_for_supervised_update"), \
             patch.object(actions, "reports", return_value={"audit": {"state": "published"}}), contextlib.redirect_stdout(stream):
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0, stream.getvalue())
        self.assertEqual([row[0] for row in launches], ["audit"])  # the live resume was adopted, not relaunched
        self.assertIn('"checkpoint":"adopted_live_job"', stream.getvalue())
        self.assertEqual(len(calls), 4)  # three training samples, then one audit sample

    def test_babysit_refuses_unverifiable_tracked_job(self):
        source, _ = self._babysit_fixture()
        self._write_campaign(source)
        self._write_tracked_handle(source)
        unknown = {"processes": [{"pid": 77, "created": None, "command": None}]}
        mismatch = {"processes": [{"pid": 77, "created": "other", "command": "dummy"}]}
        for live in (unknown, mismatch):
            launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
            with patch.object(actions, "inventory", return_value=live), patch.object(actions, "plan", side_effect=plan), \
                 patch.object(actions, "execute", side_effect=execute) as launch, contextlib.redirect_stdout(io.StringIO()) as out:
                result = actions.supervise(self.loaded, "train", "audit", 10)
            self.assertEqual(result, 2)
            self.assertIn("refusing to start another", out.getvalue())
            launch.assert_not_called()

    def test_babysit_survives_one_status_timeout(self):
        self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        calls = []
        def timeout_once(config):
            calls.append(1)
            if len(calls) == 1:
                raise subprocess.TimeoutExpired("powershell.exe", 20)
            return status(config)
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=timeout_once), patch.object(actions, "reports", return_value={"audit": {"state": "published"}}), \
             patch.object(actions.time, "sleep") as sleep, contextlib.redirect_stdout(io.StringIO()) as out:
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertIn("status inspection retry", out.getvalue())
        sleep.assert_any_call(30)
        self.assertEqual([row[0] for row in launches], ["resume", "audit"])

    def test_resource_guard_single_breach_is_transient(self):
        self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        calls = []
        def breach_once(config):
            calls.append(1)
            sample = status(config)
            if len(calls) == 1:
                sample.update(state="live", resourceGuardExceeded=True)
            return sample
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=breach_once), patch.object(actions, "reports", return_value={"audit": {"state": "published"}}), \
             patch.object(actions, "wait_for_supervised_update"), patch.object(actions.time, "sleep"), \
             contextlib.redirect_stdout(io.StringIO()) as out:
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertIn("transient resource guard breach", out.getvalue())
        self.assertNotIn("resource_guard_pause_requested", out.getvalue())
        self.assertFalse((actions.local("runs/seed-run-resume-0001") / "pause-request.json").exists())

    def test_resource_guard_breach_requests_one_pause_then_saves(self):
        self._babysit_fixture()
        self.config["pause_control"] = {"supported_executables": ["dummy.mjs"]}
        self.save()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: False)
        calls = []
        def breached_until_saved(config):
            calls.append(1)
            if len(calls) <= 4:  # three samples confirm the breach; a fourth live sample must not re-request
                return {"state": "live", "job": "resume", "configChanged": False, "resourceGuardExceeded": True,
                        "progress": None, "checkpoint": None, "stderrBytes": 0, "artifacts": {}}
            run = actions.local(config["paths"]["run"])
            checkpoint = run / "checkpoint-000001.json.gz"
            checkpoint.write_bytes(gzip.compress(json.dumps({"sequence": 1, "receiptCount": 1, "pendingReceipt": None,
                                                             "identity": {}}).encode()))
            actions.atomic_json(run / "paused.json", {"schema": 1, "phase": "training", "run": str(run),
                                                      "protocolHash": actions.digest(run / "protocol.json"),
                                                      "checkpoint": str(checkpoint), "checkpointSha256": actions.digest(checkpoint)})
            return status(config)
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=breached_until_saved), patch.object(actions, "wait_for_supervised_update"), \
             patch.object(actions.time, "sleep"), contextlib.redirect_stdout(io.StringIO()) as out:
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 0)
        self.assertEqual(out.getvalue().count('"checkpoint":"resource_guard_pause_requested"'), 1)
        self.assertIn("PAUSED", out.getvalue())
        self.assertEqual([row[0] for row in launches], ["resume"])
        request = actions.read_json(actions.local("runs/seed-run-resume-0001") / "pause-request.json")
        self.assertEqual(request["schema"], 1)

    def test_audit_resource_guard_breach_stops_for_review_without_pause_request(self):
        # The audit runner never reads pause-request.json, so a confirmed audit breach must not request one.
        self._babysit_fixture()
        self.config["pause_control"] = {"supported_executables": ["dummy.mjs"]}
        self.save()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        def audit_not_published(config, name, foreground=False):
            result = execute(config, name, foreground)
            if name == "audit":
                (actions.local(config["paths"]["run"]) / "audit.json").unlink()
            return result
        def audit_breached(config):
            sample = status(config)
            if sample["job"] == "audit":
                sample.update(state="live", resourceGuardExceeded=True)
            return sample
        run = actions.local("runs/seed-run-resume-0001")
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=audit_not_published), \
             patch.object(actions, "status", side_effect=audit_breached), patch.object(actions, "wait_for_supervised_update"), \
             patch.object(actions.time, "sleep"), contextlib.redirect_stdout(io.StringIO()) as out:
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 2)
        self.assertIn('"checkpoint":"paused_for_review"', out.getvalue())
        self.assertNotIn("resource_guard_pause_requested", out.getvalue())
        self.assertFalse((run / "pause-request.json").exists())
        self.assertEqual([row[0] for row in launches], ["resume", "audit"])

    def test_training_breach_with_unreadable_handle_stops_for_review(self):
        self._babysit_fixture()
        self.config["pause_control"] = {"supported_executables": ["dummy.mjs"]}
        self.save()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: False)
        calls = []
        def breached_then_corrupt_handle(config):
            calls.append(1)
            if len(calls) == 3:  # the second re-sample corrupts the tracked handle before confirmation is read
                actions.state_path(config).write_text("{not json", encoding="utf-8")
            if len(calls) <= 3:
                return {"state": "live", "job": "resume", "configChanged": False, "resourceGuardExceeded": True,
                        "progress": None, "checkpoint": None, "stderrBytes": 0, "artifacts": {}}
            return status(config)
        run = actions.local("runs/seed-run-resume-0001")
        with patch.object(actions, "plan", side_effect=plan), patch.object(actions, "execute", side_effect=execute), \
             patch.object(actions, "status", side_effect=breached_then_corrupt_handle), patch.object(actions, "wait_for_supervised_update"), \
             patch.object(actions.time, "sleep"), contextlib.redirect_stdout(io.StringIO()) as out:
            result = actions.supervise(self.loaded, "train", "audit", 10)
        self.assertEqual(result, 2)
        self.assertIn('"checkpoint":"paused_for_review"', out.getvalue())
        self.assertNotIn("resource_guard_pause_requested", out.getvalue())
        self.assertFalse((run / "pause-request.json").exists())
        self.assertEqual([row[0] for row in launches], ["resume"])

    def test_power_pacing_follows_charger_and_is_validated(self):
        run = self.root / "power-run"
        run.mkdir()
        config = {"power_pacing": {"ac": 0.75, "battery": 0.25}}
        with patch.object(actions, "on_ac_power", return_value=False), contextlib.redirect_stdout(io.StringIO()):
            actions.update_power_pacing(config, run)
        self.assertEqual(actions.read_json(run / "power-pacing.json")["duty"], 0.25)
        with patch.object(actions, "on_ac_power", return_value=True), contextlib.redirect_stdout(io.StringIO()):
            actions.update_power_pacing(config, run)
        self.assertEqual(actions.read_json(run / "power-pacing.json")["duty"], 0.75)
        with patch.object(actions, "on_ac_power", return_value=None), contextlib.redirect_stdout(io.StringIO()):
            actions.update_power_pacing(config, run)
        self.assertEqual(actions.read_json(run / "power-pacing.json")["duty"], 0.75)
        self.config["paused"] = False
        self.config["jobs"]["train"]["argv"][-1] = "0.75"
        self.config["power_pacing"] = {"ac": 0.75, "battery": 0.25}
        self.save()
        self.assertNotIn("power_pacing", str(actions.plan(self.loaded, "train", self.empty)["blockers"]))
        self.config["power_pacing"] = {"ac": 0.5, "battery": 0.25}
        self.save()
        self.assertIn("power_pacing", str(actions.plan(self.loaded, "train", self.empty)["blockers"]))

    def test_babysit_train_only_stops_at_result_without_audit(self):
        self._babysit_fixture()
        launches, plans, plan, execute, status = self._mock_babysit_actions(lambda attempt: True)
        def complete_result(config, name, foreground=False):
            result = execute(config, name, foreground)
            if name in ('train', 'resume'):
                actions.atomic_json(actions.local(config['paths']['run']) / 'result.json', {'status': 'training-complete'})
            return result
        with patch.object(actions, 'plan', side_effect=plan), patch.object(actions, 'execute', side_effect=complete_result), \
             patch.object(actions, 'status', side_effect=status), contextlib.redirect_stdout(io.StringIO()) as out:
            first = actions.supervise(self.loaded, 'train', None, 10)
        self.assertEqual(first, 0)
        self.assertIn('training_complete', out.getvalue())
        self.assertEqual([row[0] for row in launches], ['resume'])
        with contextlib.redirect_stdout(io.StringIO()) as out:
            again = actions.supervise(self.loaded, 'train', None, 10)
        self.assertEqual(again, 0)
        self.assertIn('training_complete', out.getvalue())
        self.assertEqual([row[0] for row in launches], ['resume'])

    def test_detached_fixture_survives_launcher_and_preserves_identity(self):
        # A tiny Node timer tests OS process handling, not a graph experiment.
        (self.root / 'dummy.mjs').write_text("import {writeFileSync} from 'node:fs'; setTimeout(()=>writeFileSync('detached-marker.txt','ok'),1500);")
        self.config['paused'] = False
        self.save()
        bootstrap = self.root / 'bootstrap.py'
        bootstrap.write_text(
            "import importlib.util,json,sys\nfrom pathlib import Path\n"
            f"sys.path.insert(0,{str(Path(actions.__file__).resolve().parent)!r})\n"
            f"spec=importlib.util.spec_from_file_location('a',{str(Path(actions.__file__).resolve())!r})\n"
            "a=importlib.util.module_from_spec(spec);sys.modules[spec.name]=a;spec.loader.exec_module(a)\n"
            f"a.ROOT=Path({str(self.root)!r})\n"
            "real=a.inventory\ncalls=0\n"
            "def inventory():\n global calls\n calls+=1\n return {'freeMiB':1000,'processes':[]} if calls==1 else real()\n"
            "a.inventory=inventory\n"
            f"a.emit(a.execute(a.load_config({str(self.path)!r}),'train'))\n"
        )
        launched = subprocess.run([sys.executable, str(bootstrap)], capture_output=True, text=True, timeout=15)
        self.assertEqual(launched.returncode, 0, launched.stderr)
        self.assertIn('started', json.loads(launched.stdout))
        handle = actions.read_json(actions.state_path(self.loaded))
        self.assertTrue(handle['created'])
        self.assertIn('dummy.mjs', handle['command'])
        deadline = time.monotonic()+4
        while not (self.root/'detached-marker.txt').exists() and time.monotonic()<deadline:
            time.sleep(0.05)
        self.assertEqual((self.root/'detached-marker.txt').read_text(), 'ok')
        time.sleep(0.1)


if __name__ == '__main__':
    output = io.StringIO()
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ActionTests)
    result = unittest.TextTestRunner(stream=output).run(suite)
    print(json.dumps({"tests": result.testsRun, "passed": result.testsRun-len(result.failures)-len(result.errors), "failed": len(result.failures), "errors": len(result.errors), "scope": "synthetic Python tooling only; no graph"}))
    if not result.wasSuccessful():
        print(output.getvalue()[-4000:], file=sys.stderr)
    raise SystemExit(0 if result.wasSuccessful() else 1)
