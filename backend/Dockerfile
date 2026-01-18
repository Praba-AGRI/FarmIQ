FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
# Build context is from repo root, so we need to copy from backend/
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application
COPY backend/ .

# Expose port
EXPOSE $PORT

# Start the application
CMD uvicorn app:app --host 0.0.0.0 --port $PORT
