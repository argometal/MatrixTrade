@echo off
rem Usage: tools\test-email-inbox.cmd [baseUrl]
if "%~1"=="" (
  call "%~dp0run-tsx.cmd" tools/test-email-inbox.ts http://localhost:3002
) else (
  call "%~dp0run-tsx.cmd" tools/test-email-inbox.ts %*
)
