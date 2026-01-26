FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
# Build context should be backend/ directory
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application
COPY . .

# Expose port (Railway will set PORT at runtime)
EXPOSE 8000

# Start the application using Python script to read PORT env var
CMD ["python", "start_server.py"]
