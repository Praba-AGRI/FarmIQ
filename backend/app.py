from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

# Load environment variables FIRST to ensure they are available for singletons
load_dotenv()

# --- APScheduler Background Tasks ---
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize NVIDIA Client globally on app state
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "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")
    app.state.nvidia_client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_API_KEY
    )
    # Initialize 40-RPM cache shield globally
    app.state.ai_reasoning_cache = {}
    
    # Start background scheduler
    scheduler.start()
    from services.whatsapp_worker import schedule_whatsapp_briefings
    schedule_whatsapp_briefings(scheduler)
    
    yield
    scheduler.shutdown()

from routes import auth, farmers, fields, sensors, ai, weather, advisories, community, market, dashboard

# Initialize FastAPI app
app = FastAPI(
    title="AI Agricultural Decision Support System API",
    description="Backend API for AI-powered agricultural decision support system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",")]
print(f"CORS Origins configured: {origins}")  # Debug log



app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# Note: AI router must be registered BEFORE fields router to avoid route conflicts
# More specific routes (like /{field_id}/chat) need to be matched before generic routes (like /{field_id})
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(farmers.router, prefix="/api/farmers", tags=["Farmers"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(ai.router, prefix="/api/fields", tags=["AI"])  # Register before fields router
app.include_router(fields.router, prefix="/api/fields", tags=["Fields"])
app.include_router(sensors.router, prefix="/api", tags=["Sensors"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(advisories.router, prefix="/api/advisories", tags=["Advisories"])
app.include_router(community.router, prefix="/api/community", tags=["Community"])
app.include_router(market.router, prefix="/api/market", tags=["Market"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "agricultural-api"}


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI Agricultural Decision Support System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }




