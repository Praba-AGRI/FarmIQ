@echo off
REM Local Preview Startup Script for Windows
REM This script starts both backend and frontend servers

echo Starting Agricultural Dashboard Local Preview...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Start Backend
echo Starting Backend Server...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies if needed
if not exist "venv\.installed" (
    echo Installing backend dependencies...
    pip install -r requirements.txt
    echo. > venv\.installed
)

echo Backend starting on http://localhost:8000
echo API Docs: http://localhost:8000/docs
start "Backend Server" cmd /k "uvicorn app:app --reload --host 0.0.0.0 --port 8000"

REM Wait a bit
timeout /t 3 /nobreak >nul

REM Start Frontend
cd ..
echo.
echo Starting Frontend Server...

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install
)

echo Frontend starting on http://localhost:5173
start "Frontend Server" cmd /k "npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul




