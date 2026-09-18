# Builds dist\TBCompanion-delivery.zip for handoff (portable folder layout).
# Run from repo root: powershell -ExecutionPolicy Bypass -File .\scripts\zip-delivery.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $Root 'server.js'))) {
  Write-Error "Could not find TBCompanion root (server.js). Expected scripts under repo root."
}

$Dist = Join-Path $Root 'dist'
$Stage = Join-Path $Dist 'TBCompanion-stage'
$Zip = Join-Path $Dist 'TBCompanion-delivery.zip'

New-Item -ItemType Directory -Force -Path $Dist | Out-Null
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
if (Test-Path $Zip) { Remove-Item -Force $Zip }

$copyDirs = @('public', 'lib', 'runtime', 'delivery', 'scripts')
foreach ($d in $copyDirs) {
  $src = Join-Path $Root $d
  if (Test-Path $src) {
    Copy-Item -Recurse -Force $src (Join-Path $Stage $d)
  }
}

$copyFiles = @('server.js', 'tbc.config.json', 'start.bat', 'start-hidden.vbs', 'README.md')
foreach ($f in $copyFiles) {
  $src = Join-Path $Root $f
  if (Test-Path $src) {
    Copy-Item -Force $src (Join-Path $Stage $f)
  }
}

$dataSrc = Join-Path $Root 'data'
if (Test-Path $dataSrc) {
  Copy-Item -Recurse -Force $dataSrc (Join-Path $Stage 'data')
} else {
  New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'data') | Out-Null
}

Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath $Zip -Force
Remove-Item -Recurse -Force $Stage

Write-Host "Created: $Zip"
