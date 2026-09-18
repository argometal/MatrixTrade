# Build TBCompanion portable (Forge CORS) and copy to public/workshop/releases for online download.
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$ElectronDir = Join-Path $Root "workshop-agents\TBCompanion-electron"
$ReleaseDir = Join-Path $Root "public\workshop\releases"
New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null

Push-Location $ElectronDir
try {
  if (-not (Test-Path "node_modules\electron")) {
    npm install
  }
  npm run dist:win
  $built = Get-ChildItem -Path (Join-Path $ElectronDir "dist") -Filter "TBCompanion-*-win-portable.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $built) { throw "Portable exe not found under dist\" }
  $dest = Join-Path $ReleaseDir $built.Name
  Copy-Item -Force $built.FullName $dest
  Write-Host "Built and copied: $dest"
} finally {
  Pop-Location
}
