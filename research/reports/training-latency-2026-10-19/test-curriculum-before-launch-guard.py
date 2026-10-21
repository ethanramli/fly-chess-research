"""Bounded software tests; never load a graph or call a scientific runner."""
import contextlib
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("curriculum", Path(__file__).with_name("curriculum.py"))
actions = importlib.util.module_from_spec(spec)
spec.loader.exec_module(actions)


class ActionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="fly-actions-")
        self.root = Path(self.temp.name)
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
        self.temp.cleanup()

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
        with self.assertRaisesRegex(ValueError, "Partial"):
            actions.checkpoint(self.root / "checkpoint-123.json.gz.partial")

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

    def test_process_query_failure_is_unknown(self):
        failed = subprocess.CompletedProcess([], 1, '', 'permission denied')
        with patch.object(actions.subprocess, "run", return_value=failed):
            with self.assertRaisesRegex(RuntimeError, "state unknown"):
                actions.inventory()

    def test_detached_fixture_survives_launcher_and_preserves_identity(self):
        # A tiny Node timer tests OS process handling, not a graph experiment.
        (self.root / 'dummy.mjs').write_text("import {writeFileSync} from 'node:fs'; setTimeout(()=>writeFileSync('detached-marker.txt','ok'),1500);")
        self.config['paused'] = False
        self.save()
        bootstrap = self.root / 'bootstrap.py'
        bootstrap.write_text(
            "import importlib.util,json\nfrom pathlib import Path\n"
            f"spec=importlib.util.spec_from_file_location('a',{str(Path(actions.__file__).resolve())!r})\n"
            "a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)\n"
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
