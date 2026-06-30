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

set "PATH=%ROOT%runtime\node;%PATH%"

if not exist "%ROOT%node_modules\next\package.json" (
  echo Dependencies incomplete — running install first...
  call "%ROOT%install.bat"
  if errorlevel 1 exit /b 1
)

call "%ROOT%stop.bat" silent

if not exist "%ROOT%.next\BUILD_ID" (
  echo Building production bundle (one time)...
  call "%NPM%" run build
  if errorlevel 1 exit /b 1
)

echo MatrixTrade PROD — http://localhost:3000
"%NODE%" "%ROOT%scripts\print-url.js"
echo Lighter on memory than dev mode. Run stop.bat when done.
echo.
call "%NPM%" run start
