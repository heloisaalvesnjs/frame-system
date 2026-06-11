@echo off
cd /d "%~dp0apps\dashboard"
set NEXT_PUBLIC_API_URL=http://localhost:3000
call npm.cmd run dev
