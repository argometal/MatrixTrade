@echo off
cd /d "%~dp0.."
call tools\run-tsx.cmd tools\verify-argus-supabase-protection.ts %*
