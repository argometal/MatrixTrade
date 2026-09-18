@echo off
	presentationsettings /start /F >nul 2>&1
	taskkill /IM msedge.exe /F >nul 2>&1
	taskkill /IM cmd.exe /F >nul 2>&1