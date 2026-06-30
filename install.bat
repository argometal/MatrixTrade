@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

call "%ROOT%..\runtime\env.bat"
if errorlevel 1 pause & exit /b 1

echo MatrixTrade — installing dependencies...
echo Using Node: %NODE%
echo.
call "%NPM%" install
if errorlevel 1 (
  echo.
  echo npm install failed.
  echo If you see EPERM errors, close Cursor/terminals using this folder and run repair-install.bat
  pause
  exit /b 1
)

echo.
echo Done. Run start.bat to launch the app.
pause
