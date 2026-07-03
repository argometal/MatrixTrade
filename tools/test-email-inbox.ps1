# Manual test — POST sample email to ARGUS inbox API
# Usage: .\tools\test-email-inbox.ps1 [-BaseUrl http://localhost:3000]

param(
  [string]$BaseUrl = "http://localhost:3000"
)

$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"
if (-not (Test-Path $envFile)) {
  Write-Error ".env.local not found"
  exit 1
}

$tokenLine = Get-Content $envFile | Where-Object { $_ -match '^ARGUS_INBOX_TOKEN=' } | Select-Object -First 1
if (-not $tokenLine) {
  Write-Error "ARGUS_INBOX_TOKEN not set in .env.local"
  exit 1
}
$token = $tokenLine -replace '^ARGUS_INBOX_TOKEN=', ''

$payloadPath = Join-Path (Join-Path $PSScriptRoot "..") "argus-email-bridge\sample-email-payload.json"
$body = Get-Content -Raw $payloadPath
$uri = "$BaseUrl/api/argus/email-inbox"

Write-Host "POST $uri"
$response = Invoke-WebRequest -Uri $uri -Method POST `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body -UseBasicParsing

Write-Host "Status:" $response.StatusCode
Write-Host $response.Content
