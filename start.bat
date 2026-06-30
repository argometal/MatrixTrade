@echo off
setlocal
set "ROOT=%~dp0"
set "PORT=3000"
cd /d "%ROOT%"

call "%ROOT%..\runtime\env.bat"
if errorlevel 1 pause & exit /b 1

call "%ROOT%stop.bat" silent

if not exist "%ROOT%node_modules\next\package.json" (
  echo Dependencies incomplete — running install first...
  call "%ROOT%install.bat"
  if errorlevel 1 exit /b 1
)

echo MatrixTrade — http://localhost:%PORT%
echo Node: %NODE%
"%NODE%" "%ROOT%scripts\print-url.js"
echo Press Ctrl+C to stop, or run stop.bat to free memory.
echo.
call "%NPM%" run dev
call "%ROOT%stop.bat" silent
pause
