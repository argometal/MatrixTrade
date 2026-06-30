# MatrixTrade bridge — one-shot deploy + curl test
# Prerequisite: npx wrangler login  (once, opens browser)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$nodeDir = "c:\Tools\runtime\node"
if (Test-Path "$nodeDir\npm.cmd") {
  $env:PATH = "$nodeDir;$env:PATH"
}

Write-Host "`n=== MatrixTrade bridge deploy ===" -ForegroundColor Cyan

$whoami = npx wrangler whoami 2>&1 | Out-String
if ($whoami -match "not authenticated") {
  Write-Host "Not logged in. Run: npx wrangler login" -ForegroundColor Red
  exit 1
}

$toml = Get-Content "wrangler.toml" -Raw
if ($toml -match "REPLACE_WITH_KV_NAMESPACE_ID") {
  Write-Host "Creating KV namespace SNAPSHOT..." -ForegroundColor Yellow
  $kvOut = npx wrangler kv namespace create SNAPSHOT 2>&1 | Out-String
  if ($kvOut -match 'id = "([a-f0-9]+)"') {
    $kvId = $Matches[1]
    $toml = $toml -replace "REPLACE_WITH_KV_NAMESPACE_ID", $kvId
    Set-Content "wrangler.toml" $toml -NoNewline
    Write-Host "KV id written to wrangler.toml: $kvId"
  } else {
    Write-Host $kvOut
    throw "Could not parse KV namespace id"
  }
}

if (-not (Test-Path ".dev.vars")) {
  function New-Token { -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 32 | ForEach-Object { [char]$_ })) }
  $write = New-Token
  $read = New-Token
  @"
WRITE_TOKEN=$write
READ_TOKEN=$read
"@ | Set-Content ".dev.vars" -Encoding utf8
  Write-Host "Created .dev.vars with random tokens (local only, gitignored)"
}

$vars = @{}
Get-Content ".dev.vars" | ForEach-Object {
  if ($_ -match "^([^=]+)=(.*)$") { $vars[$Matches[1]] = $Matches[2] }
}

Write-Host "Deploying worker..." -ForegroundColor Yellow
$deployOut = npx wrangler deploy --secrets-file .dev.vars 2>&1 | Out-String
Write-Host $deployOut

if ($deployOut -match "(https://[a-z0-9-]+\.workers\.dev)") {
  $workerUrl = $Matches[1]
} else {
  throw "Could not parse worker URL from deploy output"
}

Write-Host "`nWorker URL: $workerUrl" -ForegroundColor Green

Write-Host "`nPOST /snapshot..." -ForegroundColor Yellow
curl.exe -s -w "`nHTTP %{http_code}`n" -X POST "$workerUrl/snapshot" `
  -H "Authorization: Bearer $($vars.WRITE_TOKEN)" `
  -H "Content-Type: application/json" `
  --data-binary "@sample-snapshot.json"

Write-Host "`nGET /snapshot..." -ForegroundColor Yellow
$getUrl = "$workerUrl/snapshot?token=$($vars.READ_TOKEN)"
$getBody = curl.exe -s -w "`nHTTP %{http_code}" $getUrl
Write-Host $getBody

if ($getBody -match "H001" -and $getBody -match "AMZN") {
  Write-Host "`nOK: H001 AMZN found in snapshot" -ForegroundColor Green
} else {
  Write-Host "`nWARN: H001 AMZN not found in GET response" -ForegroundColor Red
  exit 1
}

Write-Host "`n=== Pass this URL to ChatGPT ===" -ForegroundColor Cyan
Write-Host $getUrl
Write-Host "`nREAD_TOKEN is in bridge/.dev.vars (do not commit)"
