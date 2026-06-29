@echo off
setlocal EnableDelayedExpansion
set "ROOT=%~dp0"
cd /d "%ROOT%"

set "GIT=git"
if exist "C:\Tools\Git\cmd\git.exe" set "GIT=C:\Tools\Git\cmd\git.exe"
if exist "C:\Program Files\Git\cmd\git.exe" set "GIT=C:\Program Files\Git\cmd\git.exe"

"%GIT%" --version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git no encontrado. Instala Git o usa C:\Tools\Git
  pause
  exit /b 1
)

echo MatrixTrade — publicar en GitHub
echo Git: %GIT%
echo.

if not exist "%ROOT%\.git" (
  "%GIT%" init
  "%GIT%" branch -M main
)

"%GIT%" add .
"%GIT%" diff --cached --quiet
if errorlevel 1 (
  "%GIT%" commit -m "MatrixTrade MVP: experiment control H001-H030 with Obsidian storage"
) else (
  echo Sin cambios nuevos para commit.
)

"%GIT%" remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo.
  echo === Crear repo en GitHub ===
  echo 1. Abre https://github.com/new
  echo 2. Nombre: MatrixTrade  ^|  Private  ^|  SIN README
  echo 3. Copia la URL del repo y pegala abajo
  echo.
  set /p REPO_URL="URL del repo (https://github.com/USUARIO/MatrixTrade.git): "
  if "!REPO_URL!"=="" (
    echo Cancelado.
    pause
    exit /b 1
  )
  "%GIT%" remote add origin "!REPO_URL!"
)

echo.
echo Subiendo a GitHub...
"%GIT%" push -u origin main
if errorlevel 1 (
  echo.
  echo Push fallo. Causas comunes:
  echo - Repo no creado en github.com
  echo - URL incorrecta
  echo - Login: Git pedira usuario + token de GitHub
  pause
  exit /b 1
)

echo.
echo Listo. Tu repo: 
"%GIT%" remote get-url origin
pause
