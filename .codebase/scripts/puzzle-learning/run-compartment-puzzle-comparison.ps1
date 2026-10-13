param(
  [Parameter(Mandatory=$true)][string]$Out,
  [Parameter(Mandatory=$true)][int]$BaselineProcessId,
  [Parameter(Mandatory=$true)][long]$BaselineStartMilliseconds
)
$ErrorActionPreference='Stop'
if(Test-Path -LiteralPath $Out){throw 'Require a fresh coordinator output directory'}
New-Item -ItemType Directory -Path $Out | Out-Null
$started=Get-Date
$stage='wait-baseline'; $variant='original'
function Save-Status([string]$status,[string]$detail){
  $record=[ordered]@{status=$status;stage=$stage;variant=$variant;detail=$detail;
    updatedUtc=[DateTime]::UtcNow.ToString('o');elapsedSeconds=((Get-Date)-$started).TotalSeconds;
    coordinatorRssMiB=(Get-Process -Id $PID).WorkingSet64/1MB;
    scope='Serial invocation coordination only; report gates and audits determine scientific status'}
  $temp=Join-Path $Out 'status.json.partial'
  $record | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $temp -Encoding utf8
  Move-Item -LiteralPath $temp -Destination (Join-Path $Out 'status.json') -Force
  $record | ConvertTo-Json -Depth 5 -Compress | Add-Content -LiteralPath (Join-Path $Out 'stages.jsonl') -Encoding utf8
}
function Invoke-Checked([string[]]$Arguments){
  Save-Status 'running' ('node '+($Arguments -join ' '))
  & node @Arguments
  if($LASTEXITCODE -ne 0){throw ('Node invocation failed, exit '+$LASTEXITCODE)}
}
try{
  Save-Status 'running' 'Waiting for the already-started original-input graph process'
  while($true){
    $process=Get-Process -Id $BaselineProcessId -ErrorAction SilentlyContinue
    if($null -eq $process){break}
    if($process.ProcessName -ne 'node' -or ([DateTimeOffset]$process.StartTime).ToUnixTimeMilliseconds() -ne $BaselineStartMilliseconds){
      throw 'Baseline process identity changed; refusing to infer termination from a reused PID'
    }
    if(((Get-Date)-$started).TotalHours -gt 4){throw 'Coordinator wait bound exceeded; baseline left untouched'}
    Start-Sleep -Seconds 5
  }
  foreach($variant in @('original','conjoined','balanced','conjoined-balanced')){
    $run='research/reports/compartment-puzzle-'+$variant+'-2026-10-06'
    if($variant -ne 'original'){
      $stage='experiment'
      Invoke-Checked @('--max-old-space-size=256','.codebase/scripts/puzzle-learning/train-compartment-puzzle-pipeline.mjs',
        '--variant',$variant,'--out',$run,'--cpu-duty','0.5')
    }
    $stage='archive'
    $report=Get-Content -Raw -LiteralPath (Join-Path $run 'report.json') | ConvertFrom-Json
    if(-not $report.complete){throw 'Invocation is not complete; preserving its state without restarting'}
    $src=Join-Path $run 'source'
    foreach($prop in $report.identity.sources.PSObject.Properties){
      $destination=Join-Path $src $prop.Name
      New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
      Copy-Item -LiteralPath $prop.Name -Destination $destination -Force
      if((Get-FileHash -Algorithm SHA256 -LiteralPath $destination).Hash.ToLower() -ne $prop.Value){throw 'Pinned source mismatch'}
    }
    foreach($path in @('research/data/compartment-puzzle-pipeline-v1/protocol.json',
      '.codebase/scripts/puzzle-learning/audit-compartment-puzzle-pipeline.mjs','.codebase/scripts/search-and-feedback/audit-pipeline-traces.mjs')){
      Copy-Item -LiteralPath $path -Destination (Join-Path $src (Split-Path -Leaf $path)) -Force
    }
    $stage='record-audit'
    Invoke-Checked @('--max-old-space-size=256','.codebase/scripts/puzzle-learning/audit-compartment-puzzle-pipeline.mjs',
      '--run',$run,'--out',(Join-Path $run 'audit.json'))
    $stage='trace-audit'
    Invoke-Checked @('--max-old-space-size=256','.codebase/scripts/search-and-feedback/audit-pipeline-traces.mjs','--run',$run)
    $resume=Join-Path $run 'checkpoint-00004/state.json'
    $pending=Get-Content -Raw -LiteralPath $resume | ConvertFrom-Json
    if($pending.active.phase -ne 'receipt' -or $null -eq $pending.active.pending){throw 'Expected pending-receipt checkpoint missing'}
    $prefix='research/reports/compartment-puzzle-'+$variant+'-prefix-2026-10-06'
    $stage='pending-receipt-recovery'
    Invoke-Checked @('--max-old-space-size=256','.codebase/scripts/puzzle-learning/train-compartment-puzzle-pipeline.mjs',
      '--variant',$variant,'--out',$prefix,'--resume',$resume,'--max-events','1','--cpu-duty','0.5')
    $stage='prefix-audit'
    Invoke-Checked @('--max-old-space-size=256','.codebase/scripts/puzzle-learning/audit-compartment-puzzle-pipeline.mjs',
      '--run',$run,'--prefix',$prefix,'--out',(Join-Path $run 'audit-prefix.json'))
    $recovery=Get-Content -Raw -LiteralPath (Join-Path $prefix 'report.json') | ConvertFrom-Json
    if($recovery.resources.presentationsThisInvocation -ne 0){throw 'Recovery repeated neural presentations'}
    # Failed choice gates are results to preserve, not reasons to skip other variants.
    Save-Status 'variant-complete' ('Audits passed; choice gates: '+($report.summary.gates | ConvertTo-Json -Compress))
  }
  $stage='terminal'; Save-Status 'complete' 'All four invocations and independent audits completed; inspect scientific gates separately'
}catch{
  Save-Status 'stopped' $_.Exception.Message
  throw
}
