from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from routes import auth, farmers, fields, sensors, ai, weather, advisories

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Agricultural Decision Support System API",
    description="Backend API for AI-powered agricultural decision support system",
    version="1.0.0",
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
app.include_router(ai.router, prefix="/api/fields", tags=["AI"])  # Register before fields router
app.include_router(fields.router, prefix="/api/fields", tags=["Fields"])
app.include_router(sensors.router, prefix="/api", tags=["Sensors"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(advisories.router, prefix="/api/advisories", tags=["Advisories"])


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




