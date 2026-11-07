import ast, json
from pathlib import Path
root=Path.cwd()
source=(root/'python actions/curriculum.py').read_text(encoding='utf-8-sig')
tree=ast.parse(source)
node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='plan')
registration=json.loads((root/'python actions/long-term-memory-v1-live-pilot-v1-step.json').read_text())
registration['paused']=True
registration['jobs']['compare']['refuse_existing']=[] # fresh-run scenario, preserve original artifacts
namespace={'resolve_command':lambda c,j:j['argv'],'verify':lambda c:[], 'local':lambda p:root/'research/reports/overnight-peer-review-2026-11-02/primary-feedback-audit/nonexistent', 'expand':lambda c,p:p}
namespace['ROOT']=root
exec(compile(ast.Module(body=[node],type_ignores=[]),'<literal-plan>','exec'),namespace)
result=namespace['plan'](registration,'compare',{'freeMiB':0,'processes':[{'name':'node.exe','pid':123,'command':'compare-long-term-memory-v1.mjs'}]})
assert result['ready'] and result['role']=='check'
receipt={'status':'passed','readyDespitePausedAndBusy':True,'scope':'actual plan AST; mocked matching pins and fresh paths; no process launched','command':'C:/Users/ethan/.venv-class/Scripts/python.exe research/reports/overnight-peer-review-2026-11-02/primary-feedback-audit/check-guards.py'}
(Path(__file__).parent/'guard-result.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt))
