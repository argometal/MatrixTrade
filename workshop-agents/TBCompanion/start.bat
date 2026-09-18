@echo off
set "ROOT=%~dp0"
cd /d "%ROOT%"

set "NODE=%ROOT%runtime\node\node.exe"
if exist "%NODE%" goto HAVE_NODE
where node >nul 2>&1 && set "NODE=node" && goto HAVE_NODE

echo ERROR: Node.js not found.
echo Install portable Node: run runtime\install-node.bat
echo Or put node.exe in runtime\node\
pause
exit /b 1

:HAVE_NODE
echo TBC Toolbox Companion — http://127.0.0.1: (port from TBC_PORT or tbc.config.json, default 4010)
echo Modo silencioso sin esta ventana: Start-Silent.bat  o  start-hidden.vbs
echo.
"%NODE%" "%ROOT%server.js"
