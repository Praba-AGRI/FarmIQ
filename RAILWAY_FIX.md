# Railway Deployment Fix - Root Directory Configuration

## Problem

Railway build fails with:
```
sh: 1: pip: not found
```

## Root Cause

Railway is building from the repository root (which contains `package.json`), but the Python backend is in the `backend/` subdirectory. Railway needs to be configured to use `backend/` as the root directory.

## Solution (Fix in Railway Dashboard)

1. **Go to Railway Dashboard**: https://railway.app
2. **Select your service** (agricultural-backend)
3. **Go to Settings** (gear icon)
4. **Find "Source" or "Root Directory"** section
5. **Set Root Directory to**: `backend`
6. **Save** and Railway will automatically redeploy

After setting the root directory, Railway will:
- ✅ Find `requirements.txt` in the backend directory
- ✅ Auto-detect Python from `runtime.txt`
- ✅ Use `Procfile` for the start command
- ✅ Properly install Python dependencies with `pip`

## Current Configuration Files

The backend is properly configured with:
- `backend/railway.json` - Railway build configuration
- `backend/requirements.txt` - Python dependencies
- `backend/runtime.txt` - Python version (3.11.0)
- `backend/Procfile` - Start command

These files are in the correct location. Railway just needs to know that `backend/` is the project root.

## Alternative: If Root Directory Setting is Not Available

If you can't find the Root Directory setting in Railway Dashboard:

1. You may need to create a new service and select `backend` as the source directory during setup
2. Or contact Railway support for assistance with monorepo configurations

## Verification

After configuring the root directory, check the build logs:
- ✅ Should see: `pip install -r requirements.txt` succeed
- ✅ Should see: Python packages installing
- ✅ Should see: `uvicorn app:app` starting the server
