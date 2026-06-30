@echo off
setlocal
cd /d "%~dp0"
echo MatrixTrade bridge deploy
echo.
echo Step 1: Login once if needed
call c:\Tools\runtime\env.bat 2>nul
npx wrangler whoami 2>nul | findstr /i "authenticated" >nul
if errorlevel 1 (
  echo Opening Cloudflare login...
  npx wrangler login
)
echo.
echo Step 2: Deploy + test
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1"
pause
