#!/bin/bash
# Activate virtual environment and start server
cd "$(dirname "$0")"
if [ -f "../venv/bin/activate" ]; then
    source ../venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000



