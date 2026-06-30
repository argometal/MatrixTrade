@echo off
setlocal
set "RULE_NAME=MatrixTrade Dev 3000"
set "PORT=3000"

netsh advfirewall firewall show rule name="%RULE_NAME%" 2>nul | findstr /C:"%PORT%" >nul 2>&1
if not errorlevel 1 exit /b 0

netsh advfirewall firewall add rule name="%RULE_NAME%" dir=in action=allow protocol=TCP localport=%PORT% profile=private,domain enable=yes >nul 2>&1
if errorlevel 1 (
  if /i not "%~1"=="silent" (
    echo.
    echo Could not open port %PORT% in Windows Firewall.
    echo Right-click allow-firewall.bat and choose "Run as administrator".
    echo.
    pause
  )
  exit /b 1
)

if /i not "%~1"=="silent" (
  echo Firewall rule added: inbound TCP %PORT% ^(private + domain networks^)
)

exit /b 0
