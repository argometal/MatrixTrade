@echo off
cd /d "%~dp0.."
call tools\run-tsx.cmd tools\backup-argus-supabase.ts %*
