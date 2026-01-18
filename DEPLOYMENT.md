# Deployment Guide - Live Preview

This guide will help you deploy both the frontend and backend for a live preview.

## Quick Preview Options

### Option 1: Vercel (Frontend) + Railway (Backend) - Recommended

#### Frontend Deployment (Vercel)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Deploy to Vercel**:
```bash
vercel
```
Follow the prompts. Vercel will automatically detect it's a Vite project.

3. **Set Environment Variable**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.railway.app/api`

4. **Redeploy** after adding environment variable.

#### Backend Deployment (Railway)

1. **Create Railway Account**: https://railway.app
2. **Install Railway CLI**:
```bash
npm install -g @railway/cli
railway login
```

3. **Initialize Railway Project**:
```bash
cd backend
railway init
```

4. **Set Environment Variables**:
```bash
railway variables set SECRET_KEY=your-secret-key-here
railway variables set CORS_ORIGINS=https://your-frontend-url.vercel.app
```

5. **Deploy**:
```bash
railway up
```

6. **Get Backend URL**:
   - Railway will provide a URL like: `https://your-project.railway.app`
   - Update frontend's `VITE_API_BASE_URL` to point to this URL

---

### Option 2: Netlify (Frontend) + Render (Backend)

#### Frontend Deployment (Netlify)

1. **Build the project**:
```bash
npm run build
```

2. **Deploy to Netlify**:
   - Go to https://app.netlify.com
   - Drag and drop the `dist` folder, OR
   - Connect your GitHub repo and auto-deploy

3. **Set Environment Variable**:
   - Netlify Dashboard → Site Settings → Environment Variables
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com/api`

#### Backend Deployment (Render)

1. **Create Render Account**: https://render.com
2. **Create New Web Service**:
   - Connect your GitHub repo
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

3. **Set Environment Variables**:
   - `SECRET_KEY`: Generate a strong secret key
   - `CORS_ORIGINS`: Your Netlify frontend URL

---

### Option 3: Quick Local Preview with ngrok

For a quick preview without deploying:

#### Backend (Terminal 1):
```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

#### Frontend (Terminal 2):
```bash
npm run dev
```

#### Expose with ngrok (Terminal 3):
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 5173
```

This gives you a public URL for the frontend. Update `VITE_API_BASE_URL` in `src/utils/constants.js` to use ngrok URL for backend if needed.

---

## Step-by-Step: Vercel + Railway (Recommended)

### 1. Deploy Backend First (Railway)

```bash
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables set SECRET_KEY=$(openssl rand -hex 32)
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app

# Deploy
railway up
```

**Note the Railway URL** (e.g., `https://agricultural-api.railway.app`)

### 2. Deploy Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variable
vercel env add VITE_API_BASE_URL
# Enter: https://your-backend-url.railway.app/api

# Redeploy
vercel --prod
```

### 3. Update CORS in Backend

After getting your Vercel frontend URL, update Railway environment variable:
```bash
railway variables set CORS_ORIGINS=https://your-frontend.vercel.app
```

---

## Alternative: Single Command Deployment Script

Create a deployment script for easier deployment:

```bash
# deploy.sh
#!/bin/bash
echo "Deploying backend to Railway..."
cd backend
railway up

echo "Deploying frontend to Vercel..."
cd ..
vercel --prod
```

---

## Important Notes

1. **CORS Configuration**: Make sure backend CORS allows your frontend domain
2. **Environment Variables**: Both services need proper environment variables
3. **API Base URL**: Frontend must point to backend URL
4. **HTTPS**: Both services use HTTPS by default
5. **Database**: Current setup uses file storage. For production, consider upgrading to a database.

---

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_BASE_URL` environment variable
- Verify backend is running and accessible
- Check CORS settings in backend

### Backend errors
- Check Railway logs: `railway logs`
- Verify all environment variables are set
- Ensure `requirements.txt` has all dependencies

### Build errors
- Run `npm run build` locally first to check for errors
- Check Vercel build logs for specific errors

---

## Free Tier Limits

- **Vercel**: Unlimited deployments, 100GB bandwidth
- **Railway**: $5 free credit monthly
- **Render**: Free tier available (may sleep after inactivity)
- **Netlify**: 100GB bandwidth, 300 build minutes/month

For production use, consider upgrading to paid tiers or using other services.




