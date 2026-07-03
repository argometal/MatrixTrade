@echo off
setlocal
cd /d "%~dp0"
call "%~dp0..\..\runtime\env.bat" 2>nul
if exist "%~dp0..\runtime\node\npx.cmd" (
  set "NPX=%~dp0..\runtime\node\npx.cmd"
) else (
  set "NPX=npx"
)
echo Deploying argus-email-intake Worker...
"%NPX%" wrangler deploy
pause
