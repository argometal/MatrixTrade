# One-time: download Node.js Windows x64 zip into ..\runtime\node\
$ErrorActionPreference = 'Stop'
$Version = 'v22.14.0'
$Root = $PSScriptRoot
$NodeDir = Join-Path $Root 'node'
$ZipName = "node-$Version-win-x64.zip"
$Url = "https://nodejs.org/dist/$Version/$ZipName"
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "tbc-node-$Version"

Write-Host "TBC: installing Node $Version into $NodeDir"

New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
try {
  $ZipPath = Join-Path $TempRoot $ZipName
  Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing
  Expand-Archive -Path $ZipPath -DestinationPath $TempRoot -Force
  $Inner = Join-Path $TempRoot "node-$Version-win-x64"
  if (-not (Test-Path (Join-Path $Inner 'node.exe'))) {
    throw "node.exe not found after extract: $Inner"
  }
  if (Test-Path $NodeDir) {
    Remove-Item -LiteralPath $NodeDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $NodeDir -Force | Out-Null
  Copy-Item -Path (Join-Path $Inner '*') -Destination $NodeDir -Recurse -Force
  $exePath = Join-Path $NodeDir 'node.exe'
  Write-Host "OK: $exePath"
  & (Join-Path $NodeDir 'node.exe') -v
}
finally {
  Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
