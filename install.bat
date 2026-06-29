@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

set "NODE=%ROOT%runtime\node\node.exe"
set "NPM=%ROOT%runtime\node\npm.cmd"

if not exist "%NODE%" (
  echo.
  echo ERROR: Node not found at runtime\node\
  echo.
  echo Copy the Node folder from another Tools project:
  echo   FROM: c:\Tools\runtime\node
  echo   TO:   %ROOT%runtime\node
  echo.
  echo Or run: setup-runtime.bat
  echo.
  pause
  exit /b 1
)

rem Postinstall scripts call "node" — must be on PATH (not only npm.cmd)
set "PATH=%ROOT%runtime\node;%PATH%"

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
