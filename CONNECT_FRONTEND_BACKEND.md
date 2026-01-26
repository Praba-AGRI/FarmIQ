# Connect Frontend (Vercel) to Backend (Railway)

## Step 1: Get Your Railway Backend URL

1. Go to your Railway dashboard: https://railway.app
2. Select your backend service
3. Go to **Settings** → **Networking**
4. Copy your **Public Domain** (e.g., `https://your-service.railway.app`)
5. Your API base URL will be: `https://your-service.railway.app/api`

## Step 2: Configure Frontend (Vercel)

1. Go to your Vercel dashboard: https://vercel.com
2. Select your **FarmIQ** project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-service.railway.app/api` (use your actual Railway URL)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** tab
7. Click the **⋯** (three dots) on the latest deployment
8. Click **Redeploy** to apply the new environment variable

## Step 3: Configure Backend CORS (Railway)

1. Go back to Railway dashboard
2. Select your backend service
3. Go to **Variables** tab
4. Add/Update the `CORS_ORIGINS` variable:
   - **Name**: `CORS_ORIGINS`
   - **Value**: `https://your-vercel-app.vercel.app` (your Vercel URL)
   - If you have multiple domains, separate with commas: `https://app1.vercel.app,https://app2.vercel.app`
5. Railway will automatically redeploy when you save

## Step 4: Verify Connection

1. Open your Vercel frontend URL in a browser
2. Open browser DevTools (F12) → **Network** tab
3. Try to login or access any API feature
4. Check if API calls are going to your Railway backend URL
5. If you see CORS errors, double-check the `CORS_ORIGINS` variable in Railway

## Troubleshooting

### Backend not starting (PORT error)
- ✅ **Fixed**: The Dockerfile now uses a Python script to read PORT correctly
- Railway should automatically set the PORT environment variable
- Check Railway logs to confirm the server started

### CORS errors
- Make sure `CORS_ORIGINS` in Railway includes your exact Vercel URL
- Include the protocol (`https://`)
- No trailing slashes
- Railway will auto-redeploy after changing variables

### API calls failing
- Check that `VITE_API_BASE_URL` is set correctly in Vercel
- Make sure it ends with `/api` (e.g., `https://your-service.railway.app/api`)
- Redeploy Vercel after adding the environment variable
- Check browser console for the actual API URL being used

### Backend health check
- Visit: `https://your-service.railway.app/health`
- Should return: `{"status": "healthy", "service": "agricultural-api"}`

## Quick Reference

- **Frontend**: Vercel** → Set `VITE_API_BASE_URL` environment variable
- **Backend: Railway** → Set `CORS_ORIGINS` environment variable
- **API Base URL format**: `https://your-railway-url.railway.app/api`
- **CORS format**: `https://your-vercel-url.vercel.app` (no trailing slash)
