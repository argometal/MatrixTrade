@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

set "NODE=%ROOT%runtime\node\node.exe"
set "NPM=%ROOT%runtime\node\npm.cmd"

if not exist "%NODE%" (
  echo ERROR: Node not found at runtime\node\
  pause
  exit /b 1
)

rem Postinstall scripts and Next.js need "node" on PATH
set "PATH=%ROOT%runtime\node;%PATH%"

if not exist "%ROOT%node_modules\next\package.json" (
  echo Dependencies incomplete — running install first...
  call "%ROOT%install.bat"
  if errorlevel 1 exit /b 1
)

echo MatrixTrade — http://localhost:3000
echo Press Ctrl+C to stop.
echo.
call "%NPM%" run dev
