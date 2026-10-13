@echo off
setlocal enabledelayedexpansion
title LendNest - Smart Rental Platform

echo ==============================================================
echo    🌿 LendNest - Smart Rental & Sharing Platform
echo    "Borrow Smart. Share More."
echo ==============================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH!
    echo Please install Node.js LTS from https://nodejs.org/
    echo or run: winget install OpenJS.NodeJS.LTS
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking Node.js environment...
node -v
echo.

:: Check backend node_modules
if not exist "backend\node_modules\" (
    echo [2/4] Installing backend dependencies...
    cd backend && call npm install && cd ..
) else (
    echo [2/4] Backend dependencies verified.
)

:: Check frontend node_modules
if not exist "frontend\node_modules\" (
    echo [3/4] Installing frontend dependencies...
    cd frontend && call npm install && cd ..
) else (
    echo [3/4] Frontend dependencies verified.
)

:: Check database seed
if not exist "database\lendnest.sqlite" (
    echo [Seed] Initializing SQLite database and realistic demo records...
    cd backend && call npm run seed && cd ..
)

echo.
echo ==============================================================
echo  🚀 Starting LendNest Full-Stack Development Servers...
echo  - Backend API:  http://localhost:5000
echo  - Frontend Web: http://localhost:5173
echo.
echo  Demo Accounts:
echo    Admin:  admin@lendnest.com / Admin123!
echo    Host:   sarah@lendnest.com / User123!
echo    Renter: alex@lendnest.com  / User123!
echo ==============================================================
echo.
echo Opening browser in 3 seconds...
start "" http://localhost:5173

:: Run full app concurrently
call npm run dev

pause
