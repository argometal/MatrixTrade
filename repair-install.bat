@echo off
setlocal
set "ROOT=%~dp0"
cd /d "%ROOT%"

echo MatrixTrade — clean reinstall
echo.
echo This removes node_modules and installs again.
echo Close any terminal or app using MatrixTrade first.
echo.
pause

if exist "%ROOT%node_modules" (
  echo Removing node_modules...
  rmdir /s /q "%ROOT%node_modules" 2>nul
  if exist "%ROOT%node_modules" (
    echo.
    echo Could not delete node_modules — file lock or SLB policy.
    echo Close Cursor, stop start.bat, then retry.
    pause
    exit /b 1
  )
)

if exist "%ROOT%package-lock.json" del /f "%ROOT%package-lock.json"

call "%ROOT%install.bat"
