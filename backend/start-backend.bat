@echo off
REM Start backend server with virtual environment activated
cd /d %~dp0
cd ..
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
    cd backend
    python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
) else (
    echo Virtual environment not found!
    echo Please create a venv first: python -m venv venv
    pause
)



