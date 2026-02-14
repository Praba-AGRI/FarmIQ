from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class FarmingType(str, Enum):
    ORGANIC = "organic"
    CONVENTIONAL = "conventional"


class Language(str, Enum):
    ENGLISH = "en"
    TAMIL = "ta"


class RecommendationStatus(str, Enum):
    DO_NOW = "do_now"
    WAIT = "wait"
    MONITOR = "monitor"


# User Schemas
class UserCreate(BaseModel):
    name: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str
    location: str
    farming_type: FarmingType
    preferred_language: Language


class UserLogin(BaseModel):
    email_or_mobile: str
    password: str


class UserResponse(BaseModel):
    user_id: str
    name: str
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    location: str
    farming_type: str
    preferred_language: str
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[EmailStr] = None
    location: Optional[str] = None
    farming_type: Optional[FarmingType] = None
    preferred_language: Optional[Language] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# Field Schemas
class FieldCreate(BaseModel):
    name: str
    crop: str
    sowing_date: str  # YYYY-MM-DD format
    area_acres: float = Field(gt=0)
    sensor_node_id: str


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    crop: Optional[str] = None
    sowing_date: Optional[str] = None
    area_acres: Optional[float] = Field(None, gt=0)
    sensor_node_id: Optional[str] = None


class FieldResponse(BaseModel):
    field_id: str
    farmer_id: str
    name: str
    crop: str
    sowing_date: str
    area_acres: float
    sensor_node_id: str

    class Config:
        from_attributes = True


# Sensor Data Schemas
class SensorDataCreate(BaseModel):
    timestamp: Optional[str] = None  # ISO format, defaults to now
    air_temp: float
    air_humidity: float = Field(ge=0, le=100)
    soil_temp: float
    soil_moisture: float = Field(ge=0, le=100)
    light_lux: float = Field(ge=0)
    wind_speed: Optional[float] = Field(None, ge=0)  # Optional wind speed in km/h
    sensor_node_id: str


class SensorDataResponse(BaseModel):
    timestamp: str
    air_temp: float
    air_humidity: float
    soil_temp: float
    soil_moisture: float
    light_lux: float
    wind_speed: Optional[float] = None

    class Config:
        from_attributes = True


class AggregatedSensorData(BaseModel):
    air_temp: dict  # {"min": float, "max": float, "avg": float}
    air_humidity: dict
    soil_temp: dict
    soil_moisture: dict
    light_lux: dict
    wind_speed: Optional[dict] = None  # {"min": float, "max": float, "avg": float}
    window: str  # "24h", "7d", "30d"


# AI Schemas
class AIRecommendationRequest(BaseModel):
    farmer_id: str
    field_id: str


class RecommendationItem(BaseModel):
    title: str
    description: str
    status: RecommendationStatus
    explanation: Optional[str] = None
    timing: Optional[str] = None
    ml_data: Optional[dict] = None
    ai_reasoning: Optional[str] = None


class AIRecommendationResponse(BaseModel):
    crop_stage: str
    gdd_value: float
    recommendations: List[RecommendationItem]
    ai_reasoning_text: Optional[str] = None


class ChatMessage(BaseModel):
    message: str
    language: Optional[str] = "en"


class ChatResponse(BaseModel):
    id: Optional[str] = None
    type: Optional[str] = None # 'user' or 'ai'
    message: str # helping frontend which expects 'message'
    timestamp: str
    response: Optional[str] = None # Keeping for backward compatibility if needed, or remove? 
    # Actually frontend uses `response.data.response || response.data.message`.
    # Let's keep it simple.


class CardReasoningRequest(BaseModel):
    title: str
    field_context: Optional[dict] = None


class CardReasoningResponse(BaseModel):
    reasoning: str


class TransparencyData(BaseModel):
    sensor_values: dict
    predicted_stage: str
    gdd_value: float
    irrigation_logic: str
    pest_risk_factors: List[str]


# Weather Schemas
class WeatherResponse(BaseModel):
    temperature: float
    humidity: float
    wind_speed: float
    conditions: str
    location: str


class ForecastItem(BaseModel):
    time: str
    temperature: float
    conditions: str


class WeatherForecast(BaseModel):
    location: str
    forecast: List[ForecastItem]


class WeatherAlert(BaseModel):
    type: str  # "rainfall", "heat", "humidity", "spray"
    title: str
    message: str


class WeatherAlertsResponse(BaseModel):
    alerts: List[WeatherAlert]


# New Weather Schemas for One Call API 3.0
class CurrentWeather(BaseModel):
    temperature: float
    humidity: int
    wind_speed: float  # km/h
    condition: str
    rain: float  # mm (last hour)
    feels_like: float


class MinutelyForecast(BaseModel):
    time: str
    precipitation: float  # mm


class HourlyForecast(BaseModel):
    time: str
    temperature: float
    condition: str
    rain: float  # mm


class DailyForecast(BaseModel):
    date: str
    temp_min: float
    temp_max: float
    condition: str
    rain: float  # mm


class WeatherLiveResponse(BaseModel):
    current: CurrentWeather
    minutely: List[MinutelyForecast]
    hourly: List[HourlyForecast]
    daily: List[DailyForecast]
    location: str


class WeatherHistoryResponse(BaseModel):
    date: str
    avg_temperature: float
    avg_rainfall: float
    climate_trend: str  # "warmer", "cooler", "similar"
    location: str


class WeatherSummaryResponse(BaseModel):
    summary_today: str
    summary_tomorrow: str
    location: str


class WeatherAIHelpRequest(BaseModel):
    question: str
    lat: float
    lon: float


class WeatherAIHelpResponse(BaseModel):
    answer: str
    confidence: float  # 0.0-1.0
    weather_context: dict


class WeatherAlertOneCall(BaseModel):
    event: str
    severity: str  # "extreme", "severe", "moderate", "minor"
    description: str
    start: str  # ISO timestamp
    end: str  # ISO timestamp


class WeatherAlertsOneCallResponse(BaseModel):
    alerts: List[WeatherAlertOneCall]


# Advisory Schemas
class AdvisoryItem(BaseModel):
    type: str  # "irrigation", "nutrients", "pest", etc.
    status: RecommendationStatus
    message: str


class AdvisoryResponse(BaseModel):
    advisory_id: str
    field_id: str
    field_name: str
    date: str
    recommendations: List[AdvisoryItem]




