@echo off
rem Run tsx scripts without PowerShell execution-policy issues (uses npx.cmd).
call "c:\Tools\runtime\env.bat"
if errorlevel 1 exit /b 1
cd /d "%~dp0.."
npx.cmd tsx %*
