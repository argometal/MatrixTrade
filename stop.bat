@echo off
setlocal
set "ROOT=%~dp0"
set "PORT=3000"
set "FOUND=0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  set "FOUND=1"
  if /i not "%~1"=="silent" echo Cerrando MatrixTrade en puerto %PORT%, PID %%a...
  taskkill /PID %%a /T /F >nul 2>&1
)

if /i "%~1"=="silent" goto :done_silent

if "%FOUND%"=="0" (
  echo No hay MatrixTrade escuchando en el puerto %PORT%.
) else (
  echo Puerto %PORT% liberado. Memoria de Node/Next liberada.
)
pause
exit /b 0

:done_silent
if "%FOUND%"=="1" echo Puerto %PORT% liberado.
exit /b 0
