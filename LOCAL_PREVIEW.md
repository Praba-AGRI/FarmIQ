# Local Preview Guide

Run both frontend and backend locally for preview.

## Quick Start

### Step 1: Start Backend Server

Open Terminal 1:
```bash
# Activate virtual environment first
cd ..
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# OR: source venv/bin/activate  # Mac/Linux

# Then start backend
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Backend will be running at: `http://localhost:8000`
API docs available at: `http://localhost:8000/docs`

### Step 2: Start Frontend Server

Open Terminal 2:
```bash
npm install
npm run dev
```

Frontend will be running at: `http://localhost:5173`

### Step 3: Open in Browser

Open your browser and go to: **http://localhost:5173**

---

## Troubleshooting

### Backend Issues

**Port already in use?**
```bash
# Use a different port
uvicorn app:app --reload --port 8001
```

**Python dependencies not found?**
```bash
# Activate venv first
.\venv\Scripts\Activate.ps1  # Windows
# OR: source venv/bin/activate  # Mac/Linux

# Then install dependencies
cd backend
pip install -r requirements.txt
```

**Module not found errors (like argon2)?**
```bash
# Make sure venv is activated before running server
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# OR: source venv/bin/activate  # Mac/Linux

cd backend
python -m uvicorn app:app --reload
```

### Frontend Issues

**Port already in use?**
- Vite will automatically use the next available port (5174, 5175, etc.)
- Check the terminal output for the actual URL

**Dependencies not installed?**
```bash
npm install
```

**API connection errors?**
- Make sure backend is running on port 8000
- Check browser console for errors
- Verify `src/utils/constants.js` has: `http://localhost:8000/api`

---

## Testing the Setup

1. **Backend Health Check**: Visit `http://localhost:8000/health`
   - Should return: `{"status": "healthy", "service": "agricultural-api"}`

2. **Backend API Docs**: Visit `http://localhost:8000/docs`
   - Should show Swagger UI with all API endpoints

3. **Frontend**: Visit `http://localhost:5173`
   - Should show the landing page

---

## Development Tips

- Backend auto-reloads on file changes (thanks to `--reload` flag)
- Frontend auto-reloads on file changes (Vite HMR)
- Check both terminal windows for any errors
- Use browser DevTools (F12) to see console errors

---

## Default URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **Backend Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health




