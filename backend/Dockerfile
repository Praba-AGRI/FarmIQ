FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
# Build context is from repo root, so we need to copy from backend/
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application
COPY backend/ .

# Expose port (Railway will set PORT at runtime)
EXPOSE 8000

# Start the application
# Use shell form to allow environment variable substitution
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
