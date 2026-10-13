@echo off
title LendNest Local App
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Please install the LTS version from https://nodejs.org/
  echo Then close and reopen this file.
  pause
  exit /b 1
)
cd /d "%~dp0"
start "" http://localhost:3000
node server.js
pause
