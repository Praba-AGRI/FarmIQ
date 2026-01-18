# AI Agricultural Decision Support System - Backend API

FastAPI backend for the AI-powered agricultural decision support system. This backend acts as an orchestrator and data provider, handling authentication, farmer/field management, sensor data storage, AI agent integration, and weather APIs.

## Features

- **Authentication**: JWT-based authentication with signup/login
- **Farmer Management**: Profile management for farmers
- **Field Management**: CRUD operations for agricultural fields
- **Sensor Data**: Receive and store sensor data from ESP32 nodes, provide current/historical/aggregated data
- **AI Integration**: Orchestrate AI agent calls for recommendations and chat
- **Weather APIs**: Reference weather data and alerts (awareness only)
- **Advisory History**: Track and retrieve past recommendations

## Tech Stack

- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation and serialization
- **JWT**: Token-based authentication
- **JSON/CSV Storage**: Simple file-based storage (upgradeable to database)

## Installation

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the development server:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI) is available at `http://localhost:8000/docs`

## Project Structure

```
backend/
├── app.py                 # FastAPI app initialization
├── requirements.txt       # Python dependencies
├── routes/               # API route handlers
│   ├── auth.py          # Authentication endpoints
│   ├── farmers.py      # Farmer management
│   ├── fields.py        # Field CRUD operations
│   ├── sensors.py       # Sensor data endpoints
│   ├── ai.py            # AI agent orchestration
│   ├── weather.py       # Weather APIs
│   └── advisories.py    # Advisory history
├── services/            # Business logic services
│   ├── storage.py      # JSON/CSV file operations
│   ├── aggregation.py  # Sensor data aggregation
│   └── auth_service.py # Authentication utilities
├── models/              # Pydantic schemas
│   └── schemas.py      # Data models
├── utils/              # Utility functions
│   └── helpers.py      # Helper functions
└── data/               # Data storage
    ├── users.json      # User data
    ├── fields.json     # Field data
    ├── advisories.json # Advisory history
    └── sensors/        # CSV files for sensor data
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current user info

### Farmers
- `GET /api/farmers/me` - Get farmer profile
- `PUT /api/farmers/me` - Update farmer profile

### Fields
- `GET /api/fields` - List all fields for current farmer
- `POST /api/fields` - Create new field
- `GET /api/fields/{field_id}` - Get field details
- `PUT /api/fields/{field_id}` - Update field
- `DELETE /api/fields/{field_id}` - Delete field

### Sensors
- `POST /api/sensor-data` - Receive sensor data from ESP32
- `GET /api/fields/{field_id}/sensors/current` - Get latest readings
- `GET /api/fields/{field_id}/sensors/historical` - Get historical data
- `GET /api/fields/{field_id}/sensors/aggregate` - Get aggregated data

### AI
- `POST /api/fields/{field_id}/recommendations` - Get AI recommendations
- `POST /api/fields/{field_id}/chat` - AI reasoning chat
- `GET /api/fields/{field_id}/transparency` - Get ML transparency data

### Weather
- `GET /api/weather/current` - Get current weather
- `GET /api/weather/forecast` - Get 24h forecast
- `GET /api/weather/alerts` - Get weather alerts

### Advisories
- `GET /api/advisories` - Get advisory history

### Health
- `GET /health` - Health check endpoint

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## Data Storage

The backend uses simple JSON and CSV files for storage:

- **users.json**: User account data
- **fields.json**: Field information
- **advisories.json**: Advisory history
- **sensors/{node_id}.csv**: Sensor readings per node

This can be easily upgraded to a database (PostgreSQL, MongoDB, etc.) by replacing the storage service.

## AI Agent Integration

The backend uses a **Reasoning Layer** that:
- Calls the AI agent to get ML/rule-based decisions
- Uses OpenAI GPT-4o-mini to generate human-readable advisories
- Incorporates farmer memory, field context, weather data, and ICAR/TNAU knowledge
- Answers farmer questions about recommendations

**Setup Required:**
1. Set `OPENAI_API_KEY` environment variable
2. Install dependencies: `pip install -r requirements.txt`
3. See `REASONING_LAYER_INTEGRATION.md` for detailed setup instructions

The `get_ai_agent_output()` function in `routes/ai.py` is a placeholder that should be replaced with actual AI agent/ML model API calls in production.

## Environment Variables

- `SECRET_KEY`: JWT secret key (change in production)
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `OPENAI_API_KEY`: OpenAI API key for reasoning layer (required)

## Development

Run with auto-reload:
```bash
uvicorn app:app --reload
```

Run tests (when implemented):
```bash
pytest
```

## Production Deployment

1. Set strong `SECRET_KEY` in environment variables
2. Configure proper CORS origins
3. Consider upgrading to database storage
4. Set up proper logging and monitoring
5. Use a production ASGI server like Gunicorn with Uvicorn workers

## Notes

- **No ML Logic**: Backend does not perform ML calculations
- **No Agronomic Logic**: All decisions come from AI agent
- **Orchestration Only**: Backend coordinates data flow
- **Upgradeable**: JSON/CSV storage can be replaced with database




