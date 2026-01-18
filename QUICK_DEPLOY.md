# Quick Deploy Guide - Get Live in 5 Minutes

## Fastest Method: Vercel + Railway

### Step 1: Deploy Backend (Railway) - 2 minutes

1. Go to https://railway.app and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `backend`
5. Railway auto-detects Python and deploys
6. Go to Settings → Variables and add:
   - `SECRET_KEY`: Generate a random string (use: `openssl rand -hex 32`)
   - `CORS_ORIGINS`: Leave empty for now, we'll update after frontend deploys
7. Copy your Railway URL (e.g., `https://agricultural-api.railway.app`)

### Step 2: Deploy Frontend (Vercel) - 2 minutes

1. Go to https://vercel.com and sign up/login
2. Click "Add New Project" → Import your GitHub repo
3. Vercel auto-detects Vite
4. Go to Settings → Environment Variables
5. Add: `VITE_API_BASE_URL` = `https://your-railway-url.railway.app/api`
6. Redeploy (or wait for auto-deploy)

### Step 3: Update Backend CORS - 1 minute

1. Go back to Railway → Settings → Variables
2. Update `CORS_ORIGINS` to your Vercel URL (e.g., `https://your-project.vercel.app`)
3. Railway auto-redeploys

**Done!** Your site is now live at your Vercel URL.

---

## Alternative: One-Click Deploy Buttons

### Deploy Backend to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Deploy Frontend to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

---

## Local Preview with Public URL (ngrok)

If you want to preview locally but make it accessible:

```bash
# Terminal 1: Start Backend
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Terminal 2: Start Frontend  
npm run dev

# Terminal 3: Expose Frontend
ngrok http 5173
```

Update `src/utils/constants.js`:
```javascript
export const API_BASE_URL = 'http://localhost:8000/api'; // For local
// Or use ngrok backend URL if exposing backend too
```

---

## Need Help?

- **Railway Issues**: Check `railway logs` or Railway dashboard logs
- **Vercel Issues**: Check Vercel dashboard → Deployments → View logs
- **CORS Errors**: Make sure backend CORS_ORIGINS includes frontend URL
- **API Errors**: Check that VITE_API_BASE_URL points to correct backend URL




