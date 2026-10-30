"""Checks for `fly detach` (fix goal task 2d): command construction and a real
detached process that outlives its launcher and sits outside every job object."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
import unittest.mock

import curriculum as api


class DetachTests(unittest.TestCase):
    def test_command_runs_fly_babysit_with_quoted_arguments_and_appends_to_log(self):
        line = api.detached_command(["--curriculum", "python actions/x.json", "--interval", "300"], Path("C:/l o g.txt"))
        self.assertIn('fly.cmd" babysit --curriculum "python actions/x.json" --interval 300 >> "C:', line)
        self.assertTrue(line.startswith('cmd.exe /d /s /c ""') and line.endswith(' 2>&1"'))
        with self.assertRaises(ValueError):
            api.detached_command(['bad"quote'], Path("log.txt"))

    def test_babysit_options_pass_through_the_detach_command_line(self):
        args = ["--curriculum", "python actions/x.json", "--interval", "120"]
        self.assertEqual(api.split_detach_argv(["detach", *args]), (["detach"], args))
        self.assertEqual(api.split_detach_argv(["--config", "c.json", "detach", *args]), (["--config", "c.json", "detach"], args))
        self.assertEqual(api.split_detach_argv(["status", "--curriculum", "x"]), (["status", "--curriculum", "x"], None))
        with unittest.mock.patch.object(api, "detach_babysit", return_value={"pid": 1}) as launched:
            self.assertEqual(api.main(["detach", *args]), 0)
        launched.assert_called_once_with(args, None)

    def test_detach_forwards_the_step_config(self):
        line = api.detached_command(["train", "--train-only"], Path("C:/log.txt"), Path("python actions/r1-step.json"))
        self.assertIn('fly.cmd" --config "python actions\\r1-step.json" babysit train --train-only >> ', line)
        with unittest.mock.patch.object(api, "detach_babysit", return_value={"pid": 1}) as launched:
            self.assertEqual(api.main(["--config", "s.json", "detach", "train", "--train-only"]), 0)
        launched.assert_called_once_with(["train", "--train-only"], Path("s.json"))

    def test_detached_process_outlives_its_launcher_outside_any_job(self):
        directory = api.ROOT / "runs/python-actions/detach-tests"
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as temp:
            marker = Path(temp) / "marker.txt"
            command = f'cmd.exe /d /s /c "ping -n 4 127.0.0.1 > nul & echo survived> "{marker}""'
            # The launcher is a separate Python process that exits right after creation.
            launcher = subprocess.run([sys.executable, "-c",
                "import json,sys;sys.path.insert(0,sys.argv[1]);import curriculum as api;"
                "pid=api.launch_detached(sys.argv[2]);print(json.dumps({'pid':pid,'inAnyJob':api.process_in_any_job(pid)}))",
                str(Path(api.__file__).parent), command], capture_output=True, text=True, timeout=90)
            self.assertEqual(launcher.returncode, 0, launcher.stderr[-800:])
            launched = json.loads(launcher.stdout.strip().splitlines()[-1])
            self.assertIs(launched["inAnyJob"], False, "a breakaway process is outside the session job object")
            self.assertFalse(marker.exists(), "work must still be pending when the launcher has already exited")
            deadline = time.monotonic() + 30
            while not marker.exists() and time.monotonic() < deadline:
                time.sleep(0.5)
            self.assertEqual(marker.read_text().strip(), "survived")

    def test_detached_process_survives_when_the_launching_session_job_is_closed(self):
        # Reproduce an agent session ending: the launcher runs inside a job object with
        # KILL_ON_JOB_CLOSE; closing the job kills the launcher. The breakaway child must
        # finish; a plain child of the same launcher (negative control) must be killed.
        import ctypes
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.CreateJobObjectW.restype = wintypes.HANDLE
        kernel.CreateJobObjectW.argtypes = (ctypes.c_void_p, wintypes.LPCWSTR)
        kernel.SetInformationJobObject.argtypes = (wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD)
        kernel.AssignProcessToJobObject.argtypes = (wintypes.HANDLE, wintypes.HANDLE)
        kernel.CloseHandle.argtypes = (wintypes.HANDLE,)

        class Basic(ctypes.Structure):
            _fields_ = [("PerProcessUserTimeLimit", ctypes.c_int64), ("PerJobUserTimeLimit", ctypes.c_int64),
                        ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                        ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                        ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD), ("SchedulingClass", wintypes.DWORD)]

        class Io(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in ("a", "b", "c", "d", "e", "f")]

        class Extended(ctypes.Structure):
            _fields_ = [("BasicLimitInformation", Basic), ("IoInfo", Io), ("ProcessMemoryLimit", ctypes.c_size_t),
                        ("JobMemoryLimit", ctypes.c_size_t), ("PeakProcessMemoryUsed", ctypes.c_size_t),
                        ("PeakJobMemoryUsed", ctypes.c_size_t)]

        job = kernel.CreateJobObjectW(None, None)
        self.assertTrue(job)
        info = Extended()
        info.BasicLimitInformation.LimitFlags = 0x2000 | 0x800  # KILL_ON_JOB_CLOSE | BREAKAWAY_OK
        self.assertTrue(kernel.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)))
        directory = api.ROOT / "runs/python-actions/detach-tests"
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as temp:
            detached, plain = Path(temp) / "detached.txt", Path(temp) / "plain.txt"
            body = ("import sys,subprocess,time;sys.path.insert(0,sys.argv[1]);import curriculum as api;sys.stdin.readline();"
                    "api.launch_detached(sys.argv[2]);subprocess.Popen(sys.argv[3]);print('ready',flush=True);time.sleep(120)")
            work = 'cmd.exe /d /s /c "ping -n 5 127.0.0.1 > nul & echo done> "{}""'
            launcher = subprocess.Popen([sys.executable, "-c", body, str(Path(api.__file__).parent),
                                         work.format(detached), work.format(plain)],
                                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            try:
                self.assertTrue(kernel.AssignProcessToJobObject(job, int(launcher._handle)))
                launcher.stdin.write("go\n")
                launcher.stdin.flush()
                self.assertEqual(launcher.stdout.readline().strip(), "ready")
                kernel.CloseHandle(job)  # the "session" ends: every job member is killed
                job = None
                launcher.wait(timeout=10)
                deadline = time.monotonic() + 30
                while not detached.exists() and time.monotonic() < deadline:
                    time.sleep(0.5)
                time.sleep(4)
                self.assertTrue(detached.exists(), "the detached process outlived the closed session job")
                self.assertFalse(plain.exists(), "negative control: an ordinary child died with the job")
            finally:
                if job:
                    kernel.CloseHandle(job)
                if launcher.poll() is None:
                    launcher.kill()

    def test_detached_venv_python_output_reaches_the_log(self):
        # The babysit runs through the venv python.exe launcher; its output must reach
        # the detached log (it did not under DETACHED_PROCESS, see the ledger).
        directory = api.ROOT / "runs/python-actions/detach-tests"
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=directory) as temp:
            log = Path(temp) / "venv.log"
            api.launch_detached(f'cmd.exe /d /s /c ""{sys.executable}" -c "print(42,flush=True)" >> "{log}" 2>&1"')
            deadline = time.monotonic() + 30
            while not (log.exists() and log.read_text().strip()) and time.monotonic() < deadline:
                time.sleep(0.5)
            self.assertEqual(log.read_text().strip(), "42")


if __name__ == "__main__":
    result = unittest.TextTestRunner(verbosity=0).run(unittest.defaultTestLoader.loadTestsFromTestCase(DetachTests))
    print(json.dumps({"tests": result.testsRun, "passed": result.testsRun - len(result.errors) - len(result.failures),
                      "failed": len(result.failures), "errors": len(result.errors),
                      "scope": "detached launch mechanics; real babysit survival is verified on a registered run"}))
    raise SystemExit(0 if result.wasSuccessful() else 1)
