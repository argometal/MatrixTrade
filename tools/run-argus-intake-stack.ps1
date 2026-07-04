# Start ARGUS dev server + permanent named tunnel (intake.argometal.dev)
param(
  [switch]$TunnelOnly,
  [switch]$DevOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Cloudflared = "c:\Tools\runtime\cloudflared.exe"
$Config = Join-Path $Root "argus-email-bridge\cloudflared\config.yml"
$TokenFile = Join-Path $Root "argus-email-bridge\cloudflared\argus-intake.token"

if (-not (Test-Path $Config)) {
  Write-Host "Missing tunnel config. Run first:"
  Write-Host "  cd $Root"
  Write-Host "  npx tsx tools/setup-argus-named-tunnel.ts --deploy-worker"
  exit 1
}

function Start-DevServer {
  $existing = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Dev server already listening on :3002"
    return
  }
  Write-Host "Starting npm run dev on :3002..."
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; npm run dev" -WindowStyle Minimized
  Start-Sleep -Seconds 8
}

function Start-NamedTunnel {
  if (-not (Test-Path $Cloudflared)) {
    throw "cloudflared not found at $Cloudflared"
  }
  $running = Get-Process cloudflared -ErrorAction SilentlyContinue
  if ($running) {
    Write-Host "cloudflared already running (PID $($running.Id))"
    return
  }
  Write-Host "Starting permanent tunnel intake.argometal.dev..."
  if (Test-Path $TokenFile) {
    $token = Get-Content $TokenFile -Raw
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$Cloudflared' tunnel run --token '$token'" -WindowStyle Minimized
  } else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$Cloudflared' tunnel --config '$Config' run argus-intake" -WindowStyle Minimized
  }
}

if (-not $TunnelOnly) { Start-DevServer }
if (-not $DevOnly) { Start-NamedTunnel }

Write-Host ""
Write-Host "Permanent intake: https://intake.argometal.dev/api/argus/email-inbox"
Write-Host "Email address:    argus@argometal.dev"
Write-Host "Keep both windows running while receiving email."
