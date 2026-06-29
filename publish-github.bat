@echo off
setlocal EnableDelayedExpansion
set "ROOT=%~dp0"
cd /d "%ROOT%"

rem --- Find git.exe ---
set "GIT=git"
where git >nul 2>&1 || (
  if exist "C:\Tools\Git\cmd\git.exe" set "GIT=C:\Tools\Git\cmd\git.exe"
)
if exist "C:\Program Files\Git\cmd\git.exe" set "GIT=C:\Program Files\Git\cmd\git.exe"

"%GIT%" --version >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Git not found.
  echo Install: https://git-scm.com/download/win
  echo Then run this script again.
  echo.
  echo See GITHUB.md for manual steps.
  pause
  exit /b 1
)

echo MatrixTrade — publish to GitHub
echo Using Git: %GIT%
echo.

if not exist "%ROOT%\.git" (
  echo Initializing repository...
  "%GIT%" init
  "%GIT%" branch -M main
)

echo Staging files...
"%GIT%" add .

"%GIT%" diff --cached --quiet
if errorlevel 1 (
  echo Creating commit...
  "%GIT%" commit -m "MatrixTrade MVP: experiment control H001-H030 with Obsidian storage"
) else (
  echo Nothing new to commit.
)

rem --- gh CLI (optional) ---
where gh >nul 2>&1
if errorlevel 1 goto MANUAL

gh auth status >nul 2>&1
if errorlevel 1 (
  echo.
  echo GitHub CLI not logged in. Run: gh auth login
  goto MANUAL
)

echo.
set /p REPO_NAME="GitHub repo name [MatrixTrade]: "
if "!REPO_NAME!"=="" set "REPO_NAME=MatrixTrade"

set /p VISIBILITY="Visibility (private/public) [private]: "
if "!VISIBILITY!"=="" set "VISIBILITY=private"

"%GIT%" remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo Creating GitHub repo !REPO_NAME!...
  gh repo create !REPO_NAME! --!VISIBILITY! --source=. --remote=origin --push
) else (
  echo Pushing to existing remote...
  "%GIT%" push -u origin main
)

if errorlevel 1 goto MANUAL

echo.
echo Done! Open your repo on GitHub.
gh repo view --web 2>nul
pause
exit /b 0

:MANUAL
echo.
echo --- Manual push ---
echo 1. Create repo at https://github.com/new  (name: MatrixTrade, private)
echo 2. Run:
echo    git remote add origin https://github.com/YOUR_USER/MatrixTrade.git
echo    git push -u origin main
echo.
echo Full guide: GITHUB.md
pause
