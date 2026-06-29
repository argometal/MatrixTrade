@echo off
setlocal
set "ROOT=%~dp0"
set "SRC=c:\Tools\runtime\node"
set "DEST=%ROOT%runtime\node"

if not exist "%SRC%\node.exe" (
  echo Source not found: %SRC%
  echo Copy runtime\node manually from TBCompanion or DataTransfer.
  pause
  exit /b 1
)

echo Copying Node runtime...
echo   FROM: %SRC%
echo   TO:   %DEST%
echo.

if not exist "%ROOT%runtime" mkdir "%ROOT%runtime"
if exist "%DEST%" (
  echo Folder already exists: %DEST%
  echo Delete it first if you want a fresh copy.
  pause
  exit /b 1
)

xcopy "%SRC%" "%DEST%\" /E /I /H /Y
if errorlevel 1 (
  echo Copy failed.
  pause
  exit /b 1
)

echo.
echo Node copied. Next: run install.bat then start.bat
pause
