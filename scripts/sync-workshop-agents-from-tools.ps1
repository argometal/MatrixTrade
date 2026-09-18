# Copy TBCompanion delivery tree into MatrixTrade/workshop-agents/TBCompanion
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Dest = Join-Path $Root "workshop-agents\TBCompanion"
$Sources = @(
  "C:\Tools\1776998963733_TBCompanion-delivery",
  "C:\Tools\TBCompanion-git",
  "C:\Tools\TBCompanion"
)
$Src = $Sources | Where-Object { Test-Path (Join-Path $_ "server.js") } | Select-Object -First 1
if (-not $Src) {
  Write-Error "No TBCompanion source found (need server.js). Checked: $($Sources -join ', ')"
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
$exclude = @("runtime\node", "data", "node_modules", ".git")
robocopy $Src $Dest /E /XD runtime\node data node_modules .git win-unpacked dist /XF *.db /NFL /NDL /NJH /NJS /nc /ns /np
if ($LASTEXITCODE -ge 8) { throw "robocopy failed $LASTEXITCODE" }
Write-Host "Synced TBCompanion from $Src to $Dest"
