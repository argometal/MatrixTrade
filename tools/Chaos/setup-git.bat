@echo off
setlocal
cd /d "%~dp0"

if exist "C:\Tools\Git\cmd\git.exe" set "GIT=C:\Tools\Git\cmd\git.exe"
if not defined GIT set "GIT=git"

echo === Chaos: init git + push to github.com/argometal/Chaos ===
echo.

if exist ".git" (
  echo .git already exists — skipping init
) else (
  "%GIT%" init
  "%GIT%" branch -M main
)

"%GIT%" remote remove origin 2>nul
"%GIT%" remote add origin https://github.com/argometal/Chaos.git

"%GIT%" add -A
"%GIT%" status

echo.
set /p CONFIRM=Commit and push? [Y/N]:
if /i not "%CONFIRM%"=="Y" exit /b 0

"%GIT%" commit -m "docs(matrixtrade): handoff inicial desde c:\Tools\Chaos" 2>nul
if errorlevel 1 echo Note: nothing new to commit, or commit failed.

"%GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo Push failed. Try:
  echo   gh auth login
  echo   or use Git Credential Manager when prompted
  exit /b 1
)

echo.
echo Done. Repo: https://github.com/argometal/Chaos
endlocal
