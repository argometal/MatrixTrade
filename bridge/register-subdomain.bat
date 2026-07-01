@echo off
setlocal
cd /d "%~dp0"
echo MatrixTrade bridge - register workers.dev subdomain
echo.
echo This step is ONE TIME per Cloudflare account.
echo Wrangler will ask you to pick a subdomain (e.g. argometal).
echo Your worker URL will be: https://matrixtrade-bridge.YOURSUB.workers.dev
echo.

call c:\Tools\runtime\env.bat
if errorlevel 1 pause & exit /b 1

if not exist ".dev.vars" (
  echo ERROR: .dev.vars missing. Run deploy.bat once first to create tokens.
  pause
  exit /b 1
)

echo Deploying interactively...
"%NPX%" wrangler deploy --secrets-file .dev.vars
if errorlevel 1 (
  echo.
  echo If deploy failed, register subdomain in dashboard:
  echo   https://dash.cloudflare.com/ -^> Workers and Pages -^> Your subdomain -^> Change
  pause
  exit /b 1
)

echo.
echo Subdomain registered. Now run deploy.bat again for curl tests.
pause
