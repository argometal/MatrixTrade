@echo off
rem MatrixTrade — Vercel CLI with portable Node (no global PATH required)
call "c:\Tools\runtime\env.bat"
if errorlevel 1 exit /b 1
cd /d "%~dp0.."
vercel %*
