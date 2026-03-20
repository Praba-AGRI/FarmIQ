from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# Get MongoDB URI from environment or default to local
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "farmiq_db")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

# Collections
daily_telemetry_collection = db["DailyTelemetry"]
sensor_raw_collection = db["SensorRaw"]

async def get_db():
    return db
