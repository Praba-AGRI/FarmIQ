# Guide to Replace Mock Data with Real API Data

This comprehensive guide provides step-by-step instructions for replacing all mock data implementations with real API calls. Each section includes the exact file paths, line numbers, and code changes needed.

## Table of Contents

1. [Overview](#overview)
2. [API Configuration](#api-configuration)
3. [Authentication](#authentication)
4. [Dashboard Page](#dashboard-page)
5. [Field Detail Page](#field-detail-page)
6. [Sensor Data](#sensor-data)
7. [Recommendations & AI](#recommendations--ai)
8. [AI Reasoning Layer](#ai-reasoning-layer)
9. [Weather Data](#weather-data)
10. [Advisory History](#advisory-history)
11. [Profile & Settings](#profile--settings)
12. [Report Generation](#report-generation)
13. [Replacing AI Assistant](#replacing-ai-assistant)
14. [Data Structure Mappings](#data-structure-mappings)
15. [Testing Checklist](#testing-checklist)

---

## Overview

The application currently uses mock data for demonstration purposes. This guide helps you replace all mock implementations with real API calls to your backend.

### Prerequisites

- Backend API is running and accessible
- API endpoints are implemented and tested
- Authentication tokens are properly configured
- API base URL is set in environment variables

---

## API Configuration

### File: `src/utils/constants.js`

**Current Configuration:**
```javascript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
```

**Action Required:**
- Set `VITE_API_BASE_URL` environment variable in production
- Or update the default URL in this file

---

## Authentication

### File: `src/services/authService.js`

**Status:** Check if authentication service uses mock data. If it does, replace with actual API calls.

**Expected Endpoints:**
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/auth/me`

---

## Dashboard Page

### File: `src/pages/DashboardPage.jsx`

#### 1. Fetch Fields Data

**Location:** Lines 152-180

**Current Code (Mock):**
```javascript
// Lines 156-180
// Mock data for demonstration - replace with actual API call
// const response = await fieldService.getAllFields();
// const fieldsData = response.data;

// Mock fields data
const fieldsData = [
  {
    id: 1,
    name: 'Field 1',
    cropName: 'Rice',
    cropStage: 'Vegetative',
    soilMoisture: 45,
    hasAlert: true,
    location: 'Tamil Nadu, India',
  },
  // ... more mock fields
];
```

**Replace With:**
```javascript
// Lines 156-158
const response = await fieldService.getAllFields();
const fieldsData = response.data;

// Remove lines 160-180 (mock data)
```

**Data Mapping:**
- Backend field_id → Frontend id
- Backend crop → Frontend cropName
- Backend location → Frontend location
- Calculate `hasAlert` based on recommendations or sensor thresholds

#### 2. Fetch Recommendations

**Location:** Lines 36-75

**Current Code (Mock):**
```javascript
// Lines 38-40
// Mock data for demonstration - replace with actual API call
// const response = await recommendationService.getRecommendations(fieldId);
// return response.data.recommendations || [];

// Mock recommendations data (lines 42-70)
if (fieldId === 1) {
  return [/* mock data */];
}
```

**Replace With:**
```javascript
// Lines 38-40
const response = await recommendationService.getRecommendations(fieldId);
return response.data.recommendations || [];

// Remove lines 42-70 (mock data)
```

**API Endpoint:** `POST /api/fields/{field_id}/recommendations`

#### 3. Fetch Weather Alerts

**Location:** Lines 77-110

**Current Code (Mock):**
```javascript
// Lines 79-81
// Mock data for demonstration - replace with actual API call
// const response = await weatherService.getAlerts(location);
// return response.data.alerts || [];

// Mock weather alerts data (lines 83-105)
```

**Replace With:**
```javascript
// Lines 79-81
const response = await weatherService.getAlerts(location);
return response.data.alerts || [];

// Remove lines 83-105 (mock data)
```

**API Endpoint:** `GET /api/weather/alerts?location={location}`

#### 4. Fetch Sensor Data

**Location:** Lines 112-150

**Current Code (Mock):**
```javascript
// Lines 114-124
// Mock data for demonstration - replace with actual API call
// const response = await sensorService.getCurrentReadings(fieldId);
// const backendData = response.data;
// return {
//   airTemperature: backendData.air_temp,
//   relativeHumidity: backendData.air_humidity,
//   soilMoisture: backendData.soil_moisture,
//   soilTemperature: backendData.soil_temp,
//   lightIntensity: backendData.light_lux,
//   windSpeed: backendData.wind_speed || null,
// };

// Mock sensor data (lines 126-145)
```

**Replace With:**
```javascript
// Lines 114-124
const response = await sensorService.getCurrentReadings(fieldId);
const backendData = response.data;
return {
  airTemperature: backendData.air_temp,
  relativeHumidity: backendData.air_humidity,
  soilMoisture: backendData.soil_moisture,
  soilTemperature: backendData.soil_temp,
  lightIntensity: backendData.light_lux,
  windSpeed: backendData.wind_speed || null,
};

// Remove lines 126-145 (mock data)
```

**API Endpoint:** `GET /api/fields/{field_id}/sensors/current`

#### 5. Create New Field

**Location:** Lines 226-283

**Current Code (Mock):**
```javascript
// Lines 231-233
// Mock implementation - in production, use actual API call
// const response = await fieldService.createField(fieldData);
// console.log('Field created:', response.data);

// For now, add to mock fields list (lines 236-247)
```

**Replace With:**
```javascript
// Lines 231-233
const response = await fieldService.createField(fieldData);
const newField = response.data;

// Remove lines 236-247 (mock field creation)
// Use response.data instead of creating mock field
```

**API Endpoint:** `POST /api/fields`

---

## Field Detail Page

### File: `src/pages/FieldDetailPage.jsx`

#### Fetch Field Data

**Location:** Lines 35-74

**Current Code (Mock):**
```javascript
// Lines 39-64
// Mock data for demonstration - map field ID to field data
const fieldId = parseInt(id);
const mockFields = {
  1: { id: 1, name: 'Field 1', ... },
  2: { id: 2, name: 'Field 2', ... },
};
const fieldData = mockFields[fieldId] || { /* default */ };
setField(fieldData);
// const response = await fieldService.getField(id);
// setField(response.data);
```

**Replace With:**
```javascript
// Lines 39-64
const response = await fieldService.getField(id);
setField(response.data);

// Remove lines 40-64 (mock fields mapping)
```

**API Endpoint:** `GET /api/fields/{field_id}`

---

## Sensor Data

### File: `src/components/tabs/SensorDataTab.jsx`

#### Fetch Current Sensor Readings

**Location:** Lines 21-50

**Current Code (Mock):**
```javascript
// Lines 25-33
// Mock data for demonstration
setSensorData({
  airTemperature: 28.5,
  relativeHumidity: 65,
  soilMoisture: 45,
  soilTemperature: 26.2,
  lightIntensity: 850,
  windSpeed: 12.0,
});
// const response = await sensorService.getCurrentReadings(fieldId);
// const backendData = response.data;
// setSensorData({
//   airTemperature: backendData.air_temp,
//   relativeHumidity: backendData.air_humidity,
//   soilMoisture: backendData.soil_moisture,
//   soilTemperature: backendData.soil_temp,
//   lightIntensity: backendData.light_lux,
//   windSpeed: backendData.wind_speed || null,
// });
```

**Replace With:**
```javascript
// Lines 25-44
const response = await sensorService.getCurrentReadings(fieldId);
const backendData = response.data;
setSensorData({
  airTemperature: backendData.air_temp,
  relativeHumidity: backendData.air_humidity,
  soilMoisture: backendData.soil_moisture,
  soilTemperature: backendData.soil_temp,
  lightIntensity: backendData.light_lux,
  windSpeed: backendData.wind_speed || null,
});

// Remove lines 26-33 (mock data)
```

**API Endpoint:** `GET /api/fields/{field_id}/sensors/current`

**Data Mapping:**
- `air_temp` → `airTemperature`
- `air_humidity` → `relativeHumidity`
- `soil_moisture` → `soilMoisture`
- `soil_temp` → `soilTemperature`
- `light_lux` → `lightIntensity`
- `wind_speed` → `windSpeed`

---

### File: `src/components/tabs/GraphsTab.jsx`

#### Fetch Historical Sensor Data

**Location:** Lines 20-34

**Current Code (Mock):**
```javascript
// Lines 24-26
// Mock data for demonstration
const mockData = generateMockData(timeRange);
setChartData(mockData);
// const response = await sensorService.getHistoricalData(fieldId, timeRange);
// setChartData(response.data);
```

**Replace With:**
```javascript
// Lines 24-26
const response = await sensorService.getHistoricalData(fieldId, timeRange);
setChartData(response.data);

// Remove lines 25-26 (mock data generation)
// Remove generateMockData function (lines 36-59)
```

**API Endpoint:** `GET /api/fields/{field_id}/sensors/historical?range={timeRange}`

**Expected Response Format:**
```javascript
[
  {
    timestamp: "2024-01-15T10:00:00",
    air_temp: 28.5,
    air_humidity: 65.0,
    soil_moisture: 45.0,
    soil_temp: 26.2,
    light_lux: 850.0,
    wind_speed: 12.0
  },
  // ... more data points
]
```

**Data Transformation:**
You may need to transform the backend data to match the chart format:
```javascript
const transformedData = response.data.map(item => ({
  time: formatTime(item.timestamp, timeRange),
  temperature: item.air_temp,
  humidity: item.air_humidity,
  soilMoisture: item.soil_moisture,
  soilTemperature: item.soil_temp,
  lightIntensity: item.light_lux,
  windSpeed: item.wind_speed || 0,
}));
```

---

## Recommendations & AI

### File: `src/components/tabs/RecommendationsTab.jsx`

#### Fetch Recommendations

**Location:** Lines 19-57

**Current Code (Mock):**
```javascript
// Lines 23-49
// Mock data for demonstration
setRecommendations([
  {
    id: 1,
    title: t('irrigation'),
    description: 'Irrigate the field...',
    status: RECOMMENDATION_STATUS.DO_NOW,
    // ... more mock data
  },
]);
// const response = await recommendationService.getRecommendations(fieldId);
// setRecommendations(response.data);
```

**Replace With:**
```javascript
// Lines 23-51
const response = await recommendationService.getRecommendations(fieldId);
const backendData = response.data;

// Map backend response to frontend format
setRecommendations(backendData.recommendations.map((rec, index) => ({
  id: index + 1,
  title: rec.title,
  description: rec.description,
  status: rec.status, // Should match RECOMMENDATION_STATUS enum
  explanation: rec.explanation,
  timing: rec.timing,
})));

// Remove lines 24-49 (mock data)
```

**API Endpoint:** `POST /api/fields/{field_id}/recommendations`

**Expected Response Format:**
```javascript
{
  crop_stage: "Vegetative",
  gdd_value: 1250.0,
  recommendations: [
    {
      title: "Irrigation",
      description: "...",
      status: "do_now", // or "wait", "monitor"
      explanation: "...",
      timing: "Within next 6 hours"
    }
  ],
  ai_reasoning_text: "..."
}
```

---

### File: `src/components/field/ChatInterface.jsx`

#### Load Chat History

**Location:** Lines 24-40

**Current Code (Mock):**
```javascript
// Lines 26-34
// Mock data for demonstration
setMessages([
  {
    id: 1,
    type: 'ai',
    message: 'Hello! I am your AI Reasoning Assistant...',
    timestamp: new Date().toISOString(),
  },
]);
// const response = await chatService.getChatHistory(fieldId);
// setMessages(response.data);
```

**Replace With:**
```javascript
// Lines 26-36
const response = await chatService.getChatHistory(fieldId);
setMessages(response.data || []);

// Remove lines 27-34 (mock data)
```

**API Endpoint:** `GET /api/fields/{field_id}/chat/history` (if implemented)

**Note:** If chat history endpoint doesn't exist, you can initialize with an empty array or a welcome message.

#### Send Chat Message

**Location:** Lines 57-82

**Current Code (Mock):**
```javascript
// Lines 58-68
// Mock response for demonstration
setTimeout(() => {
  const aiResponse = {
    id: Date.now() + 1,
    type: 'ai',
    message: `Based on the current sensor readings...`,
    timestamp: new Date().toISOString(),
  };
  setMessages((prev) => [...prev, aiResponse]);
  setLoading(false);
}, 1000);

// const response = await chatService.sendMessage(fieldId, inputMessage);
// setMessages((prev) => [...prev, response.data]);
```

**Replace With:**
```javascript
// Lines 58-71
const response = await chatService.sendMessage(fieldId, inputMessage);
const aiResponse = {
  id: Date.now() + 1,
  type: 'ai',
  message: response.data.response,
  timestamp: response.data.timestamp,
};
setMessages((prev) => [...prev, aiResponse]);
setLoading(false);

// Remove lines 59-68 (mock setTimeout)
```

**API Endpoint:** `POST /api/fields/{field_id}/chat`

**Expected Request:**
```javascript
{
  message: "Why do you recommend irrigation?"
}
```

**Expected Response:**
```javascript
{
  response: "Based on the current sensor readings...",
  timestamp: "2024-01-15T10:00:00"
}
```

---

### File: `src/components/tabs/TransparencyTab.jsx`

#### Fetch Transparency Data

**Location:** Lines 17-46

**Current Code (Mock):**
```javascript
// Lines 21-38
// Mock data for demonstration
setTransparencyData({
  sensorValues: {
    airTemperature: 28.5,
    relativeHumidity: 65,
    // ... more mock data
  },
  predictedStage: 'Vegetative',
  gddValue: 1250,
  // ... more mock data
});
// const response = await recommendationService.getTransparencyData(fieldId);
// setTransparencyData(response.data);
```

**Replace With:**
```javascript
// Lines 21-40
const response = await recommendationService.getTransparencyData(fieldId);
const backendData = response.data;

// Map backend snake_case to frontend camelCase
setTransparencyData({
  sensorValues: {
    airTemperature: backendData.sensor_values.air_temp,
    relativeHumidity: backendData.sensor_values.air_humidity,
    soilMoisture: backendData.sensor_values.soil_moisture,
    soilTemperature: backendData.sensor_values.soil_temp,
    lightIntensity: backendData.sensor_values.light_lux,
  },
  predictedStage: backendData.predicted_stage,
  gddValue: backendData.gdd_value,
  irrigationLogic: backendData.irrigation_logic,
  pestRiskFactors: backendData.pest_risk_factors,
});

// Remove lines 22-38 (mock data)
```

**API Endpoint:** `GET /api/fields/{field_id}/transparency`

---

## Weather Data

### File: `src/components/tabs/WeatherTab.jsx`

#### Fetch Weather Data

**Location:** Lines 19-57

**Current Code (Mock):**
```javascript
// Lines 23-47
// Mock data for demonstration
setWeather({
  temperature: 28,
  humidity: 65,
  windSpeed: 12,
  conditions: 'Partly Cloudy',
  forecast: [/* mock forecast */],
});
setAlerts([/* mock alerts */]);
// const [weatherRes, alertsRes] = await Promise.all([
//   weatherService.getCurrentWeather(location),
//   weatherService.getAlerts(location),
// ]);
// setWeather(weatherRes.data);
// setAlerts(alertsRes.data);
```

**Replace With:**
```javascript
// Lines 23-53
const [weatherRes, forecastRes, alertsRes] = await Promise.all([
  weatherService.getCurrentWeather(location),
  weatherService.getForecast(location),
  weatherService.getAlerts(location),
]);

setWeather({
  temperature: weatherRes.data.temperature,
  humidity: weatherRes.data.humidity,
  windSpeed: weatherRes.data.wind_speed,
  conditions: weatherRes.data.conditions,
  forecast: forecastRes.data.forecast || [],
});
setAlerts(alertsRes.data.alerts || []);

// Remove lines 24-47 (mock data)
```

**API Endpoints:**
- `GET /api/weather/current?location={location}`
- `GET /api/weather/forecast?location={location}`
- `GET /api/weather/alerts?location={location}`

---

## Advisory History

### File: `src/pages/AdvisoryHistoryPage.jsx`

#### Fetch Advisory History

**Location:** Lines 31-81

**Current Code (Mock):**
```javascript
// Lines 35-69
// Mock data for demonstration
setFields([
  { id: 1, name: 'Field 1' },
  { id: 2, name: 'Field 2' },
]);
setAdvisories([
  {
    id: 1,
    fieldId: 1,
    fieldName: 'Field 1',
    date: '2024-01-15',
    recommendations: [/* mock data */],
  },
  // ... more mock advisories
]);
// const [fieldsRes, advisoriesRes] = await Promise.all([
//   fieldService.getAllFields(),
//   advisoryService.getAdvisoryHistory({ fieldId: selectedField, dateRange }),
// ]);
// setFields(fieldsRes.data);
// setAdvisories(advisoriesRes.data);
```

**Replace With:**
```javascript
// Lines 35-75
const [fieldsRes, advisoriesRes] = await Promise.all([
  fieldService.getAllFields(),
  advisoryService.getAdvisoryHistory({ 
    fieldId: selectedField !== 'all' ? selectedField : null, 
    dateRange: dateRange !== 'all' ? dateRange : null 
  }),
]);

setFields(fieldsRes.data);
setAdvisories(advisoriesRes.data.map(adv => ({
  id: adv.advisory_id,
  fieldId: parseInt(adv.field_id),
  fieldName: adv.field_name,
  date: adv.date,
  recommendations: adv.recommendations,
})));

// Remove lines 36-69 (mock data)
```

**API Endpoint:** `GET /api/advisories?field_id={fieldId}&date_range={dateRange}`

---

## Profile & Settings

### File: `src/pages/ProfilePage.jsx`

#### Fetch Profile Data

**Location:** Lines 44-71

**Current Code (Mock):**
```javascript
// Lines 48-65
// Mock data
setFormData({
  name: user?.name || 'Farmer Name',
  mobile: user?.mobile || '9876543210',
  location: user?.location || 'Tamil Nadu, India',
  // ... more mock data
});
setFields([/* mock fields */]);
// const response = await fieldService.getAllFields();
// setFields(response.data);

// Load profile picture
// const pictureUrl = profileService.getProfilePicture(user?.user_id);
// setProfilePicture(pictureUrl);
```

**Replace With:**
```javascript
// Lines 48-65
// Fetch profile data from API if not in user context
// const profileResponse = await authService.getProfile();
// setFormData({
//   name: profileResponse.data.name,
//   mobile: profileResponse.data.mobile,
//   location: profileResponse.data.location,
//   farmingType: profileResponse.data.farming_type,
//   preferredLanguage: profileResponse.data.preferred_language,
// });

const fieldsResponse = await fieldService.getAllFields();
setFields(fieldsResponse.data);

// Load profile picture
if (user?.profile_picture_url) {
  const pictureUrl = profileService.getProfilePicture(user.user_id);
  setProfilePicture(pictureUrl);
}

// Remove lines 49-59 (mock data)
```

#### Update Profile

**Location:** Lines 80-93

**Current Code (Mock):**
```javascript
// Lines 84-85
// API call to update profile
// await authService.updateProfile(formData);
```

**Replace With:**
```javascript
// Lines 84-85
await authService.updateProfile(formData);
// Remove alert and handle success properly
```

**API Endpoint:** `PUT /api/farmers/me`

#### Upload Profile Picture

**Location:** Lines 127-150

**Current Code (Mock):**
```javascript
// Lines 132-141
// Mock implementation - in production, use actual API call
// const response = await profileService.uploadProfilePicture(file);
// setProfilePicture(response.data.profile_picture_url);

// For now, create a local preview
const reader = new FileReader();
reader.onloadend = () => {
  setProfilePicture(reader.result);
};
reader.readAsDataURL(file);
```

**Replace With:**
```javascript
// Lines 132-141
const response = await profileService.uploadProfilePicture(file);
setProfilePicture(response.data.profile_picture_url);

// Remove lines 136-141 (FileReader mock)
```

**API Endpoint:** `POST /api/farmers/me/profile-picture`

#### Remove Profile Picture

**Location:** Lines 152-168

**Current Code (Mock):**
```javascript
// Lines 157-158
// Mock implementation - in production, use actual API call
// await profileService.removeProfilePicture();
```

**Replace With:**
```javascript
// Lines 157-158
await profileService.removeProfilePicture();
```

**API Endpoint:** `DELETE /api/farmers/me/profile-picture`

---

## Report Generation

### File: `src/services/reportService.js`

This file contains mock data for report generation. Replace all mock implementations with actual API calls.

#### Fetch Full Report Data

**Location:** Lines 11-108

**Current Code (Mock):**
```javascript
// Lines 17-35: Mock fields data
// Lines 41-70: Mock advisories data
// Lines 79-95: Mock sensor data
```

**Replace With:**
```javascript
// Lines 17-35
const fieldsResponse = await fieldService.getAllFields();
const fields = fieldsResponse.data;

// Lines 41-70
const advisoriesResponse = await advisoryService.getAdvisoryHistory();
const advisories = advisoriesResponse.data;

// Lines 79-95
const fieldsWithSensorData = await Promise.all(
  fields.map(async (field) => {
    const sensorResponse = await sensorService.getHistoricalData(field.id, '30d');
    return { ...field, sensorData: sensorResponse.data };
  })
);
```

#### Fetch Graphs Data

**Location:** Lines 111-135

**Current Code (Mock):**
```javascript
// Lines 131-135: Mock data generation
```

**Replace With:**
```javascript
// Lines 131-135
const response = await sensorService.getHistoricalData(fieldId, timeRange);
return response.data;
```

#### Fetch Recommendations Data

**Location:** Lines 140-175

**Current Code (Mock):**
```javascript
// Lines 156-175: Mock recommendations data
```

**Replace With:**
```javascript
// Lines 156-175
const response = await recommendationService.getRecommendations(fieldId);
return response.data;
```

#### Fetch Advisories Data

**Location:** Lines 180-215

**Current Code (Mock):**
```javascript
// Lines 192-215: Mock advisories data
```

**Replace With:**
```javascript
// Lines 192-215
const response = await advisoryService.getAdvisoryHistory({ fieldId });
return response.data;
```

#### Fetch Weather Data

**Location:** Lines 220-258

**Current Code (Mock):**
```javascript
// Lines 234-253: Mock weather data
```

**Replace With:**
```javascript
// Lines 234-253
const [currentResponse, forecastResponse, alertsResponse] = await Promise.all([
  weatherService.getCurrentWeather(location),
  weatherService.getForecast(location),
  weatherService.getAlerts(location),
]);
return {
  current: currentResponse.data,
  forecast: forecastResponse.data,
  alerts: alertsResponse.data,
};
```

---

## Replacing AI Assistant

### Backend: AI Agent Integration

### File: `backend/routes/ai.py`

#### Function: `call_ai_agent`

**Location:** Lines 17-109

**Current Implementation (Mock):**
```python
# Lines 32-34
# In production, this would be:
# response = await ai_agent_client.get_recommendations(field_id, farmer_id)
# return response

# Mock implementation (lines 36-92)
```

**Replace With Real AI Agent:**

**Option 1: External AI Service API**
```python
async def call_ai_agent(field_id: str, farmer_id: str, question: Optional[str] = None) -> dict:
    """
    Call external AI agent service/API
    """
    import httpx  # or requests, aiohttp
    
    # Get sensor data
    from routes.sensors import get_current_sensor_readings
    sensor_data = await get_current_sensor_readings(field_id, {"user_id": farmer_id})
    
    # Get field data
    from routes.fields import get_field
    field = await get_field(field_id, {"user_id": farmer_id})
    
    # Prepare payload for AI agent
    payload = {
        "field_id": field_id,
        "farmer_id": farmer_id,
        "sensor_data": {
            "air_temp": sensor_data.air_temp,
            "air_humidity": sensor_data.air_humidity,
            "soil_temp": sensor_data.soil_temp,
            "soil_moisture": sensor_data.soil_moisture,
            "light_lux": sensor_data.light_lux,
        },
        "field_info": {
            "crop": field.crop,
            "sowing_date": field.sowing_date,
            "location": field.location,
        },
        "question": question,  # For chat interface
    }
    
    # Call AI agent API
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://your-ai-agent-api.com/recommendations",
            json=payload,
            headers={"Authorization": f"Bearer {AI_AGENT_API_KEY}"},
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()
```

**Option 2: Local AI Model (ML Model Integration)**
```python
async def call_ai_agent(field_id: str, farmer_id: str, question: Optional[str] = None) -> dict:
    """
    Call local ML model for recommendations
    """
    import your_ml_model  # Import your ML model
    
    # Get sensor data
    sensor_data = await get_current_sensor_readings(field_id, {"user_id": farmer_id})
    field = await get_field(field_id, {"user_id": farmer_id})
    
    # Prepare input for ML model
    model_input = {
        "sensor_readings": {
            "air_temp": sensor_data.air_temp,
            "air_humidity": sensor_data.air_humidity,
            "soil_temp": sensor_data.soil_temp,
            "soil_moisture": sensor_data.soil_moisture,
            "light_lux": sensor_data.light_lux,
        },
        "crop_type": field.crop,
        "sowing_date": field.sowing_date,
        "location": field.location,
    }
    
    # Get predictions from ML model
    predictions = your_ml_model.predict(model_input)
    
    # Format response
    return {
        "crop_stage": predictions.crop_stage,
        "gdd_value": predictions.gdd_value,
        "recommendations": predictions.recommendations,
        "ai_reasoning_text": predictions.reasoning,
        "sensor_values": model_input["sensor_readings"]
    }
```

**Option 3: LangChain/LLM Integration**
```python
async def call_ai_agent(field_id: str, farmer_id: str, question: Optional[str] = None) -> dict:
    """
    Use LangChain or similar LLM framework
    """
    from langchain.llms import OpenAI  # or your preferred LLM
    from langchain.prompts import PromptTemplate
    
    # Get sensor and field data
    sensor_data = await get_current_sensor_readings(field_id, {"user_id": farmer_id})
    field = await get_field(field_id, {"user_id": farmer_id})
    
    # Initialize LLM
    llm = OpenAI(temperature=0.7)
    
    # Create prompt template
    prompt = PromptTemplate(
        input_variables=["sensor_data", "crop", "question"],
        template="""
        You are an agricultural AI assistant. Based on the following sensor data:
        {sensor_data}
        
        Crop: {crop}
        
        Question: {question}
        
        Provide recommendations and reasoning.
        """
    )
    
    # Generate response
    response = llm(prompt.format(
        sensor_data=sensor_data,
        crop=field.crop,
        question=question or "What recommendations do you have?"
    ))
    
    # Parse and format response
    return parse_llm_response(response)
```

**Configuration Required:**
1. Add AI agent API URL to environment variables
2. Add API keys/secrets to environment variables
3. Install required packages (httpx, langchain, etc.)
4. Update `requirements.txt` with new dependencies

**Environment Variables:**
```bash
AI_AGENT_API_URL=https://your-ai-agent-api.com
AI_AGENT_API_KEY=your-api-key
# Or for local ML model:
ML_MODEL_PATH=/path/to/model
```

---

## Data Structure Mappings

### Backend to Frontend Field Mapping

| Backend Field | Frontend Field | Notes |
|--------------|----------------|-------|
| `field_id` | `id` | Convert to number if needed |
| `name` | `name` | Direct mapping |
| `crop` | `cropName` | Direct mapping |
| `sowing_date` | `sowingDate` | Format conversion may be needed |
| `area_acres` | `areaAcres` | Direct mapping |
| `location` | `location` | Direct mapping |
| `sensor_node_id` | `sensorNodeId` | Direct mapping |

### Sensor Data Mapping

| Backend Field | Frontend Field | Type |
|--------------|----------------|------|
| `air_temp` | `airTemperature` | Float → Number |
| `air_humidity` | `relativeHumidity` | Float → Number |
| `soil_temp` | `soilTemperature` | Float → Number |
| `soil_moisture` | `soilMoisture` | Float → Number |
| `light_lux` | `lightIntensity` | Float → Number |
| `wind_speed` | `windSpeed` | Float → Number (nullable) |
| `timestamp` | `timestamp` | ISO string |

### Recommendation Status Mapping

| Backend Value | Frontend Constant |
|--------------|-------------------|
| `"do_now"` | `RECOMMENDATION_STATUS.DO_NOW` |
| `"wait"` | `RECOMMENDATION_STATUS.WAIT` |
| `"monitor"` | `RECOMMENDATION_STATUS.MONITOR` |

---

## Testing Checklist

After replacing mock data, test the following:

### Authentication
- [ ] Login with valid credentials
- [ ] Signup creates new user
- [ ] Invalid credentials show error
- [ ] Token is stored and used for API calls

### Dashboard
- [ ] Fields list loads correctly
- [ ] Field cards show correct data
- [ ] Sensor values display properly
- [ ] Recommendations appear on cards
- [ ] Weather alerts show correctly
- [ ] Add new field works

### Field Detail Page
- [ ] Field data loads for each field ID
- [ ] Sensor data tab shows real readings
- [ ] Graphs tab displays historical data
- [ ] Recommendations tab shows AI recommendations
- [ ] Chat interface sends/receives messages
- [ ] Weather tab shows current and forecast
- [ ] Transparency tab shows ML data

### Reports
- [ ] Full report generates with real data
- [ ] Graphs report exports charts
- [ ] Recommendations report works
- [ ] Advisories report works
- [ ] Weather report works

### Profile
- [ ] Profile data loads
- [ ] Profile update works
- [ ] Profile picture upload works
- [ ] Profile picture displays correctly
- [ ] Profile picture removal works

### Error Handling
- [ ] Network errors are handled gracefully
- [ ] 404 errors show appropriate messages
- [ ] 500 errors show appropriate messages
- [ ] Loading states work correctly
- [ ] Retry functionality works

---

## Common Issues and Solutions

### Issue: CORS Errors
**Solution:** Ensure backend CORS is configured to allow frontend origin.

### Issue: Authentication Token Not Sent
**Solution:** Check `src/services/api.js` for proper token injection in headers.

### Issue: Data Format Mismatch
**Solution:** Add data transformation layer in service files to map backend to frontend format.

### Issue: API Base URL Not Set
**Solution:** Set `VITE_API_BASE_URL` environment variable or update `src/utils/constants.js`.

### Issue: Field ID Type Mismatch
**Solution:** Ensure consistent use of string or number for field IDs throughout the application.

---

## Additional Notes

1. **Error Handling:** Always wrap API calls in try-catch blocks
2. **Loading States:** Show loading indicators during API calls
3. **Data Validation:** Validate API responses before using data
4. **Type Safety:** Consider using TypeScript for better type safety
5. **Caching:** Consider implementing caching for frequently accessed data
6. **Pagination:** If API returns paginated data, implement pagination in UI
7. **Real-time Updates:** Consider WebSocket integration for real-time sensor data

---

## Quick Reference: File Locations

| Feature | File Path | Mock Data Lines |
|---------|-----------|----------------|
| Dashboard Fields | `src/pages/DashboardPage.jsx` | 156-180 |
| Dashboard Recommendations | `src/pages/DashboardPage.jsx` | 36-75 |
| Dashboard Weather | `src/pages/DashboardPage.jsx` | 77-110 |
| Dashboard Sensors | `src/pages/DashboardPage.jsx` | 112-150 |
| Field Detail | `src/pages/FieldDetailPage.jsx` | 35-74 |
| Sensor Data Tab | `src/components/tabs/SensorDataTab.jsx` | 21-50 |
| Graphs Tab | `src/components/tabs/GraphsTab.jsx` | 20-34, 36-59 |
| Recommendations Tab | `src/components/tabs/RecommendationsTab.jsx` | 19-57 |
| Chat Interface | `src/components/field/ChatInterface.jsx` | 24-40, 57-82 |
| Transparency Tab | `src/components/tabs/TransparencyTab.jsx` | 17-46 |
| Weather Tab | `src/components/tabs/WeatherTab.jsx` | 19-57 |
| Advisory History | `src/pages/AdvisoryHistoryPage.jsx` | 31-81 |
| Profile Page | `src/pages/ProfilePage.jsx` | 44-71, 80-93, 127-168 |
| Report Service | `src/services/reportService.js` | Throughout file |
| AI Agent Output (Mock) | `backend/routes/ai.py` | 22-103 |
| Reasoning Layer | `backend/services/reasoning_layer.py` | No mock data (uses OpenAI API) |

---

## Support

If you encounter issues while replacing mock data:
1. Check browser console for error messages
2. Verify API endpoints are accessible
3. Check network tab for failed requests
4. Verify authentication tokens are valid
5. Ensure data format matches expected structure

For AI agent integration, refer to your AI service documentation or ML model integration guide.

