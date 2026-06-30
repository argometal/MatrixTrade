@echo off
setlocal
cd /d "%~dp0"
echo MatrixTrade bridge deploy
echo.

call c:\Tools\runtime\env.bat
if errorlevel 1 (
  echo ERROR: Node runtime not found. Run c:\Tools\runtime\install-node.bat
  pause
  exit /b 1
)

if not exist "%~dp0node_modules\wrangler\package.json" (
  echo Installing bridge dependencies...
  call "%NPM%" install
  if errorlevel 1 pause & exit /b 1
)

echo Step 1: Login once if needed
"%NPX%" wrangler whoami 2>&1 | findstr /i /c:"not authenticated" >nul
if not errorlevel 1 (
  echo Opening Cloudflare login in browser...
  "%NPX%" wrangler login
  if errorlevel 1 pause & exit /b 1
)

echo.
echo Step 2: Deploy + test
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
if errorlevel 1 pause & exit /b 1
pause
