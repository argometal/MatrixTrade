# MatrixTrade bridge — one-shot deploy + curl test
# Prerequisite: wrangler login (deploy.bat runs it if needed)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$runtimeNode = "c:\Tools\runtime\node"
$npx = if (Test-Path "$runtimeNode\npx.cmd") { "$runtimeNode\npx.cmd" } else { "npx" }
$npm = if (Test-Path "$runtimeNode\npm.cmd") { "$runtimeNode\npm.cmd" } else { "npm" }

if ($npx -ne "npx") {
  $env:PATH = "$runtimeNode;$env:PATH"
}

function Invoke-Wrangler {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $out = & $npx wrangler @Args 2>&1 | Out-String
    return $out
  } finally {
    $ErrorActionPreference = $prev
  }
}

Write-Host "`n=== MatrixTrade bridge deploy ===" -ForegroundColor Cyan
Write-Host "Using: $npx"

if (-not (Test-Path "node_modules\wrangler")) {
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  & $npm install
}

$whoami = Invoke-Wrangler whoami 2>&1 | Out-String
if ($whoami -match "not authenticated") {
  Write-Host "Not logged in. Run deploy.bat or:" -ForegroundColor Red
  Write-Host "  $npx wrangler login"
  exit 1
}

$toml = Get-Content "wrangler.toml" -Raw
if ($toml -match "REPLACE_WITH_KV_NAMESPACE_ID") {
  Write-Host "Creating KV namespace SNAPSHOT..." -ForegroundColor Yellow
  $kvOut = Invoke-Wrangler kv namespace create SNAPSHOT 2>&1 | Out-String
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
$deployOut = Invoke-Wrangler deploy --secrets-file .dev.vars
Write-Host $deployOut

if ($deployOut -match "register a workers\.dev subdomain") {
  Write-Host "`nSTOP: workers.dev subdomain not registered yet." -ForegroundColor Red
  Write-Host "Run once (interactive, picks your subdomain):" -ForegroundColor Yellow
  Write-Host "  register-subdomain.bat"
  Write-Host "Or dashboard: Workers and Pages -> Your subdomain -> Change"
  exit 1
}

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
