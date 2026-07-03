@echo off
setlocal
cd /d "%~dp0"

if exist "C:\Tools\Git\cmd\git.exe" set "GIT=C:\Tools\Git\cmd\git.exe"
if not defined GIT set "GIT=git"

echo Publishing Chaos to github.com/argometal/Chaos ...
"%GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo If push failed: ensure you are logged in and have write access.
  echo   gh auth login
  echo   or add your SSH key to GitHub
  exit /b 1
)
echo Done.
