#!/bin/bash

# Local Preview Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting Agricultural Dashboard Local Preview..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Function to start backend
start_backend() {
    echo "📦 Starting Backend Server..."
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
    
    # Install dependencies if needed
    if [ ! -f "venv/.installed" ]; then
        echo "Installing backend dependencies..."
        pip install -r requirements.txt
        touch venv/.installed
    fi
    
    echo "✅ Backend starting on http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting Frontend Server..."
    cd ..
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm install
    fi
    
    echo "✅ Frontend starting on http://localhost:5173"
    npm run dev
}

# Check if we should run both or just one
if [ "$1" == "backend" ]; then
    start_backend
elif [ "$1" == "frontend" ]; then
    start_frontend
else
    echo "Starting both servers..."
    echo "Press Ctrl+C to stop both servers"
    echo ""
    
    # Start backend in background
    start_backend &
    BACKEND_PID=$!
    
    # Wait a bit for backend to start
    sleep 3
    
    # Start frontend
    start_frontend &
    FRONTEND_PID=$!
    
    # Wait for user interrupt
    wait $BACKEND_PID $FRONTEND_PID
fi




