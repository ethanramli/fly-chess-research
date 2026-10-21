$ErrorActionPreference = 'Stop'
$repoPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$launcher = Join-Path $repoPath 'fly.cmd'
$existing = Get-Command fly -ErrorAction SilentlyContinue
if ($existing -and $existing.Source -ne $launcher) {
    throw "Another command already owns the name fly: $($existing.Source)"
}
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries = @($userPath -split ';' | Where-Object { $_ })
if ($entries -notcontains $repoPath) {
    [Environment]::SetEnvironmentVariable('Path', (($entries + $repoPath) -join ';'), 'User')
}
if (($env:Path -split ';') -notcontains $repoPath) {
    $env:Path += ';' + $repoPath
}
# A fresh shell must resolve the bare command from outside the repository.
& powershell.exe -NoProfile -NonInteractive -Command 'Set-Location $env:USERPROFILE; fly babysit --help'
if ($LASTEXITCODE -ne 0) { throw 'Fresh-shell fly command check failed' }
[pscustomobject]@{ installed = $true; command = 'fly babysit'; launcher = $launcher } | ConvertTo-Json -Compress
