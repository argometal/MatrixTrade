# Push workshop-agents folders to argometal GitHub repos (init commit if empty)
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Pairs = @(
  @{ Local = "workshop-agents\TBCompanion"; Remote = "https://github.com/argometal/TBCompanion.git" },
  @{ Local = "workshop-agents\MouseSimulator"; Remote = "https://github.com/argometal/MouseSimulator.git" }
)
foreach ($p in $Pairs) {
  $dir = Join-Path $Root $p.Local
  if (-not (Test-Path $dir)) { Write-Warning "Skip missing $dir"; continue }
  Push-Location $dir
  if (-not (Test-Path ".git")) { git init | Out-Null; git branch -M main }
  git add -A
  git diff --cached --quiet
  if ($LASTEXITCODE -ne 0) {
    git commit -m "Workshop agent sync from MatrixTrade"
  }
  git remote remove origin 2>$null
  git remote add origin $p.Remote
  git push -u origin main --force
  if ($LASTEXITCODE -ne 0) { Write-Warning "Push failed for $($p.Remote) — check auth" }
  Pop-Location
  Write-Host "Pushed $($p.Local) -> $($p.Remote)"
}
