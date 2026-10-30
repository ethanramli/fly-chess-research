"""Mocked concurrency only: never call the actual supervisor body or inventory."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import threading
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / 'python actions'))
spec = importlib.util.spec_from_file_location('review_curriculum', ROOT / 'python actions/curriculum.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sys.modules[spec.name] = module
target = HERE / 'supervisor-race-fixture'
target.mkdir(exist_ok=True)
barrier = threading.Barrier(2)
inside = threading.Barrier(2)
entries = []
errors = []
original_exists = Path.exists

def exists(path):
    observed = original_exists(path)
    if path.suffix == '.lock':
        barrier.wait(timeout=5)  # both callers observe no lock before either publishes
    return observed

def body(*args, **kwargs):
    entries.append(threading.current_thread().name)
    inside.wait(timeout=5)  # prove both are inside the supervisor concurrently
    return 0

def invoke():
    try:
        assert module.supervise({}, 'train', 'audit', 10) == 0
    except BaseException as error:
        errors.append(repr(error))

with patch.object(module, 'ROOT', target), patch.object(module, 'inventory', return_value={'processes': []}), \
     patch.object(module.fly_controls, 'campaign_location', return_value=('mock', None)), \
     patch.object(module, '_supervise', side_effect=body), patch.object(Path, 'exists', exists):
    threads = [threading.Thread(target=invoke, name=f'mock-caller-{i}') for i in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)
    assert not any(t.is_alive() for t in threads)

assert len(entries) == 2 and not errors, (entries, errors)
result = {'scope': 'Mocked process inventory, lock race and supervisor body; no jobs or experiment files touched',
          'concurrentSupervisorEntries': len(entries), 'errors': errors}
(HERE / 'supervisor-output.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result))
