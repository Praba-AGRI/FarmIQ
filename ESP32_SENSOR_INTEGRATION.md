# ESP32 Sensor Integration Guide

This guide explains how to integrate ESP32 sensor nodes with the AI Farm website to send real-time sensor data for monitoring and analysis.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup: Registering Your Sensor Node](#setup-registering-your-sensor-node)
4. [API Endpoint](#api-endpoint)
5. [Data Format](#data-format)
6. [ESP32 Implementation](#esp32-implementation)
7. [Testing the Integration](#testing-the-integration)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Best Practices](#best-practices)

---

## Overview

The AI Farm system accepts sensor data from ESP32 devices through a REST API endpoint. The data is stored in CSV files and can be accessed by farmers through the web dashboard for monitoring, analysis, and AI-powered recommendations.

**Data Flow:**
```
ESP32 Device → HTTP POST Request → Backend API → CSV Storage → Web Dashboard
```

**Key Points:**
- Sensor data is sent via HTTP POST requests to `/api/sensor-data`
- Each ESP32 device must have a unique `sensor_node_id`
- The `sensor_node_id` must be registered in the website before sending data
- No authentication is required for the POST endpoint (validated by sensor_node_id existence)
- Data is automatically stored in CSV format: `{sensor_node_id}.csv`

---

## Prerequisites

### Hardware Requirements
- ESP32 development board (ESP32-WROOM, ESP32-S3, etc.)
- Sensors:
  - Air temperature sensor (DS18B20, DHT22, etc.)
  - Air humidity sensor (DHT22, SHT30, etc.)
  - Soil temperature sensor (DS18B20)
  - Soil moisture sensor (Capacitive soil moisture sensor)
  - Light intensity sensor (BH1750, LDR with ADC)
  - Wind speed sensor (optional - Anemometer)

### Software Requirements
- Arduino IDE or PlatformIO (for ESP32 programming)
- WiFi network credentials
- Backend API URL (e.g., `http://your-backend-url.com/api` or `http://localhost:8000/api`)

### Website Requirements
- A field must be created in the website with the corresponding `sensor_node_id`

---

## Setup: Registering Your Sensor Node

Before your ESP32 can send data, you must register the `sensor_node_id` in the website:

### Step 1: Create a Field in the Website

1. Log in to the AI Farm website
2. Navigate to the Dashboard
3. Click "Add New Field"
4. Fill in the field details:
   - **Field Name**: e.g., "Field 1 - North Plot"
   - **Crop**: e.g., "Rice", "Wheat", "Cotton"
   - **Sowing Date**: YYYY-MM-DD format
   - **Area (acres)**: Field area
   - **Sensor Node ID**: **This must match your ESP32's sensor_node_id**

   Example: If your ESP32 uses `sensor_node_id = "ESP32_FIELD1"`, enter exactly `ESP32_FIELD1` in the field form.

### Step 2: Verify Sensor Node ID

After creating the field, verify that the `sensor_node_id` is correctly stored:
- The field will appear in your dashboard
- Ensure the Sensor Node ID matches exactly (case-sensitive)

**Important:** The `sensor_node_id` is case-sensitive and must match exactly between:
- The field created in the website
- The `sensor_node_id` sent by your ESP32 device

---

## API Endpoint

### Endpoint Details

**URL:** `POST /api/sensor-data`

**Base URL Examples:**
- Local Development: `http://localhost:8000/api/sensor-data`
- Production: `https://your-backend-url.com/api/sensor-data`

**Headers:**
```
Content-Type: application/json
```

**Authentication:** None required (validated by sensor_node_id existence)

---

## Data Format

### Request Body Schema

The POST request must send a JSON object with the following fields:

```json
{
  "sensor_node_id": "string",        // Required: Must match field's sensor_node_id
  "air_temp": float,                 // Required: Air temperature in Celsius
  "air_humidity": float,             // Required: Air humidity (0-100%)
  "soil_temp": float,                // Required: Soil temperature in Celsius
  "soil_moisture": float,            // Required: Soil moisture (0-100%)
  "light_lux": float,                // Required: Light intensity in lux (>= 0)
  "wind_speed": float,               // Optional: Wind speed in km/h (>= 0)
  "timestamp": "string"              // Optional: ISO 8601 format (e.g., "2024-01-15T10:30:00Z")
}
```

### Field Validation Rules

| Field | Type | Required | Range/Constraints |
|-------|------|----------|-------------------|
| `sensor_node_id` | string | Yes | Must exist in fields.json |
| `air_temp` | float | Yes | Any valid float (Celsius) |
| `air_humidity` | float | Yes | 0.0 to 100.0 (percentage) |
| `soil_temp` | float | Yes | Any valid float (Celsius) |
| `soil_moisture` | float | Yes | 0.0 to 100.0 (percentage) |
| `light_lux` | float | Yes | >= 0.0 (lux) |
| `wind_speed` | float | No | >= 0.0 (km/h) |
| `timestamp` | string | No | ISO 8601 format, defaults to server time |

### Example Request

```json
{
  "sensor_node_id": "ESP32_FIELD1",
  "air_temp": 28.5,
  "air_humidity": 65.0,
  "soil_temp": 26.2,
  "soil_moisture": 45.0,
  "light_lux": 850.0,
  "wind_speed": 12.0,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Success Response

**Status Code:** `201 Created`

```json
{
  "message": "Sensor data received successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "sensor_node_id": "ESP32_FIELD1"
}
```

### Error Responses

**400 Bad Request** - Invalid sensor_node_id:
```json
{
  "detail": "Invalid sensor_node_id: No field found with this sensor node ID"
}
```

**422 Unprocessable Entity** - Validation error:
```json
{
  "detail": [
    {
      "loc": ["body", "air_humidity"],
      "msg": "ensure this value is less than or equal to 100",
      "type": "value_error.number.not_le"
    }
  ]
}
```

**500 Internal Server Error** - Storage failure:
```json
{
  "detail": "Failed to save sensor data"
}
```

---

## ESP32 Implementation

### Arduino IDE Example (C++)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// API endpoint
const char* apiUrl = "http://your-backend-url.com/api/sensor-data";

// Sensor Node ID (must match the field in website)
const char* sensorNodeId = "ESP32_FIELD1";

// Sensor pins (adjust based on your hardware)
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

#define SOIL_MOISTURE_PIN 34  // ADC pin for soil moisture
#define SOIL_TEMP_PIN 35      // ADC pin for soil temperature (if using DS18B20, use OneWire library)
#define LIGHT_SENSOR_PIN 36   // ADC pin for light sensor

// Timing
unsigned long lastSensorRead = 0;
const unsigned long sensorInterval = 300000; // 5 minutes in milliseconds

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize sensors
  dht.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LIGHT_SENSOR_PIN, INPUT);
  
  // Connect to WiFi
  connectToWiFi();
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }
  
  // Read sensors at intervals
  if (millis() - lastSensorRead >= sensorInterval) {
    sendSensorData();
    lastSensorRead = millis();
  }
  
  delay(1000);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("WiFi connected! IP address: ");
  Serial.println(WiFi.localIP());
}

void sendSensorData() {
  // Read sensor values
  float airTemp = dht.readTemperature();
  float airHumidity = dht.readHumidity();
  
  // Read soil moisture (0-100%, adjust based on your sensor)
  int soilMoistureRaw = analogRead(SOIL_MOISTURE_PIN);
  float soilMoisture = map(soilMoistureRaw, 0, 4095, 0, 100); // Adjust mapping for your sensor
  
  // Read soil temperature (example - adjust for your sensor)
  float soilTemp = readSoilTemperature(); // Implement based on your sensor
  
  // Read light intensity (adjust based on your sensor)
  int lightRaw = analogRead(LIGHT_SENSOR_PIN);
  float lightLux = map(lightRaw, 0, 4095, 0, 100000); // Adjust mapping for your sensor
  
  // Optional: Wind speed (implement based on your sensor)
  float windSpeed = 0.0; // readWindSpeed(); // Uncomment and implement if available
  
  // Check if sensor readings are valid
  if (isnan(airTemp) || isnan(airHumidity)) {
    Serial.println("Failed to read DHT sensor!");
    return;
  }
  
  // Create JSON payload
  StaticJsonDocument<512> doc;
  doc["sensor_node_id"] = sensorNodeId;
  doc["air_temp"] = airTemp;
  doc["air_humidity"] = airHumidity;
  doc["soil_temp"] = soilTemp;
  doc["soil_moisture"] = soilMoisture;
  doc["light_lux"] = lightLux;
  
  // Optional fields
  if (windSpeed > 0) {
    doc["wind_speed"] = windSpeed;
  }
  
  // Timestamp (optional - server will generate if not provided)
  // doc["timestamp"] = getISOTimestamp(); // Implement if needed
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.println("Sending sensor data:");
  Serial.println(jsonPayload);
  
  // Send HTTP POST request
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.print("HTTP Response code: ");
    Serial.println(httpResponseCode);
    
    String response = http.getString();
    Serial.println("Response: ");
    Serial.println(response);
    
    if (httpResponseCode == 201) {
      Serial.println("✓ Sensor data sent successfully!");
    }
  } else {
    Serial.print("✗ Error sending data: ");
    Serial.println(httpResponseCode);
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}

// Helper function to read soil temperature (implement based on your sensor)
float readSoilTemperature() {
  // Example: If using DS18B20, use OneWire library
  // For now, return a placeholder
  return 24.5;
}

// Helper function to get ISO timestamp (optional)
String getISOTimestamp() {
  // Implement based on time synchronization (NTP)
  // Return format: "2024-01-15T10:30:00Z"
  return "";
}
```

### PlatformIO Example (platformio.ini)

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
lib_deps = 
    bblanchon/ArduinoJson@^6.21.0
    adafruit/DHT sensor library@^1.4.4
```

### Python Example (MicroPython on ESP32)

```python
import network
import urequests
import json
import time
from dht import DHT22
from machine import Pin, ADC

# WiFi credentials
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"

# API endpoint
API_URL = "http://your-backend-url.com/api/sensor-data"

# Sensor Node ID
SENSOR_NODE_ID = "ESP32_FIELD1"

# Sensor pins
dht = DHT22(Pin(4))
soil_moisture = ADC(Pin(34))
light_sensor = ADC(Pin(36))

# Timing
SENSOR_INTERVAL = 300  # 5 minutes in seconds

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print(f"Connecting to {WIFI_SSID}...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        while not wlan.isconnected():
            pass
    print(f"WiFi connected! IP: {wlan.ifconfig()[0]}")

def read_sensors():
    dht.measure()
    air_temp = dht.temperature()
    air_humidity = dht.humidity()
    
    # Read soil moisture (0-100%)
    soil_moisture_raw = soil_moisture.read()
    soil_moisture_pct = (soil_moisture_raw / 4095) * 100
    
    # Read light intensity (adjust based on your sensor)
    light_raw = light_sensor.read()
    light_lux = (light_raw / 4095) * 100000
    
    # Placeholder for soil temp and wind speed
    soil_temp = 24.5
    wind_speed = 0.0
    
    return {
        "sensor_node_id": SENSOR_NODE_ID,
        "air_temp": air_temp,
        "air_humidity": air_humidity,
        "soil_temp": soil_temp,
        "soil_moisture": soil_moisture_pct,
        "light_lux": light_lux,
        "wind_speed": wind_speed
    }

def send_sensor_data():
    sensor_data = read_sensors()
    
    headers = {"Content-Type": "application/json"}
    json_data = json.dumps(sensor_data)
    
    try:
        response = urequests.post(API_URL, data=json_data, headers=headers)
        print(f"Response: {response.status_code}")
        print(f"Body: {response.text}")
        response.close()
        
        if response.status_code == 201:
            print("✓ Sensor data sent successfully!")
        else:
            print(f"✗ Error: {response.status_code}")
    except Exception as e:
        print(f"✗ Error sending data: {e}")

# Main loop
connect_wifi()
last_send = 0

while True:
    current_time = time.time()
    
    if current_time - last_send >= SENSOR_INTERVAL:
        send_sensor_data()
        last_send = current_time
    
    time.sleep(1)
```

---

## Testing the Integration

### Manual Testing with cURL

Test the endpoint before programming your ESP32:

```bash
curl -X POST http://localhost:8000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_node_id": "ESP32_FIELD1",
    "air_temp": 28.5,
    "air_humidity": 65.0,
    "soil_temp": 26.2,
    "soil_moisture": 45.0,
    "light_lux": 850.0,
    "wind_speed": 12.0
  }'
```

**Expected Response:**
```json
{
  "message": "Sensor data received successfully",
  "timestamp": "2024-01-15T10:30:00Z",
  "sensor_node_id": "ESP32_FIELD1"
}
```

### Testing Invalid sensor_node_id

```bash
curl -X POST http://localhost:8000/api/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_node_id": "INVALID_ID",
    "air_temp": 28.5,
    "air_humidity": 65.0,
    "soil_temp": 26.2,
    "soil_moisture": 45.0,
    "light_lux": 850.0
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "detail": "Invalid sensor_node_id: No field found with this sensor node ID"
}
```

### Verifying Data Storage

After sending data, check that it's stored:
1. Navigate to the backend `data/sensors/` directory
2. Look for a CSV file named `{sensor_node_id}.csv`
3. The file should contain the sensor readings

### Verifying in Web Dashboard

1. Log in to the website
2. Navigate to the field detail page
3. Click on the "Sensor Data" tab
4. Verify that the latest sensor readings are displayed

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "Invalid sensor_node_id" Error

**Problem:** The API returns a 400 error saying the sensor_node_id is invalid.

**Solutions:**
- Verify the `sensor_node_id` in your ESP32 code matches exactly the one in the website field
- Check for typos, case sensitivity, and extra spaces
- Ensure the field was created successfully in the website

#### 2. WiFi Connection Failed

**Problem:** ESP32 cannot connect to WiFi.

**Solutions:**
- Verify SSID and password are correct
- Check WiFi signal strength at sensor location
- Ensure 2.4 GHz WiFi is available (ESP32 doesn't support 5 GHz)
- Add retry logic with exponential backoff

#### 3. HTTP Request Timeout

**Problem:** ESP32 cannot reach the backend API.

**Solutions:**
- Verify the API URL is correct and accessible
- Check network connectivity from ESP32 to backend
- For local development, ensure ESP32 and backend are on the same network
- For production, verify DNS resolution and firewall rules

#### 4. Sensor Readings Invalid (NaN, -999, etc.)

**Problem:** Sensor values are invalid or out of range.

**Solutions:**
- Verify sensor connections (wiring, power)
- Check sensor library initialization
- Add validation before sending data
- Implement fallback values if sensors fail

#### 5. Data Not Appearing in Dashboard

**Problem:** Data is sent successfully but doesn't appear in the web dashboard.

**Solutions:**
- Check that the field belongs to the logged-in user
- Verify the `sensor_node_id` in the field matches the ESP32
- Check backend logs for errors
- Verify CSV file is being created in `data/sensors/`

#### 6. CORS Errors (Browser Testing)

**Problem:** When testing from browser, CORS errors occur.

**Solution:** CORS is not relevant for ESP32 → Backend communication. This only affects browser-based testing.

---

## Security Considerations

### Current Security Model

1. **No Authentication Required:** The POST endpoint doesn't require authentication to allow ESP32 devices (which may not support JWT tokens) to send data.

2. **Sensor Node ID Validation:** The backend validates that the `sensor_node_id` exists in `fields.json` before accepting data.

3. **Data Isolation:** Sensor data is isolated per field. Farmers can only access data from their own fields through the authenticated web interface.

### Security Recommendations

1. **Network Security:**
   - Use HTTPS in production (WSS for WebSocket if implemented)
   - Implement VPN or private network for ESP32 devices
   - Use WiFi WPA2/WPA3 encryption

2. **Data Validation:**
   - The backend already validates data ranges (humidity 0-100%, etc.)
   - Consider adding rate limiting to prevent abuse

3. **Future Enhancements:**
   - Implement API key authentication per field
   - Add device certificates for mutual TLS
   - Implement device registration with approval workflow

---

## Best Practices

### 1. Sensor Node ID Naming Convention

Use descriptive, unique names:
- Good: `ESP32_FIELD1_NORTH`, `ESP32_RICE_FIELD_A`
- Bad: `ESP32`, `sensor1`, `123`

### 2. Data Sending Frequency

- **Recommended:** Send data every 5-15 minutes
- **Minimum:** Once per hour (for monitoring)
- **Maximum:** Once per minute (consider bandwidth and storage)

### 3. Error Handling

Implement robust error handling in ESP32 code:
- Retry failed requests (with exponential backoff)
- Log errors to Serial for debugging
- Continue operating even if network fails
- Store readings locally if network is unavailable (implement later)

### 4. Sensor Calibration

- Calibrate sensors regularly for accurate readings
- Document calibration procedures
- Update sensor mappings in code as needed

### 5. Power Management

- Use deep sleep mode between readings for battery-powered devices
- Implement power-saving WiFi modes
- Monitor battery levels if applicable

### 6. Data Validation

- Validate sensor readings before sending (check for NaN, reasonable ranges)
- Implement sensor health checks
- Send diagnostic information (battery level, signal strength, etc.) if possible

### 7. Monitoring and Logging

- Log all sensor data transmissions
- Monitor API response codes
- Set up alerts for repeated failures
- Track data freshness (last successful transmission)

---

## Example: Complete ESP32 Code with Error Handling

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl = "http://your-backend-url.com/api/sensor-data";
const char* sensorNodeId = "ESP32_FIELD1";
const unsigned long sensorInterval = 300000; // 5 minutes

// Sensors
DHT dht(4, DHT22);

// State
unsigned long lastSensorRead = 0;
int retryCount = 0;
const int maxRetries = 3;

void setup() {
  Serial.begin(115200);
  dht.begin();
  connectToWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWiFi();
  }
  
  if (millis() - lastSensorRead >= sensorInterval) {
    bool success = sendSensorDataWithRetry();
    if (success) {
      retryCount = 0;
      lastSensorRead = millis();
    } else {
      retryCount++;
      if (retryCount >= maxRetries) {
        Serial.println("Max retries reached. Will try again next interval.");
        retryCount = 0;
        lastSensorRead = millis(); // Prevent infinite retry loop
      }
    }
  }
  
  delay(1000);
}

bool sendSensorDataWithRetry() {
  for (int i = 0; i < maxRetries; i++) {
    if (sendSensorData()) {
      return true;
    }
    delay(5000 * (i + 1)); // Exponential backoff
  }
  return false;
}

bool sendSensorData() {
  // Read sensors with validation
  float airTemp = dht.readTemperature();
  float airHumidity = dht.readHumidity();
  
  if (isnan(airTemp) || isnan(airHumidity)) {
    Serial.println("✗ Invalid sensor readings!");
    return false;
  }
  
  // Create JSON
  StaticJsonDocument<512> doc;
  doc["sensor_node_id"] = sensorNodeId;
  doc["air_temp"] = airTemp;
  doc["air_humidity"] = airHumidity;
  doc["soil_temp"] = 24.5; // Implement your sensor
  doc["soil_moisture"] = 45.0; // Implement your sensor
  doc["light_lux"] = 850.0; // Implement your sensor
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  // Send request
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout
  
  int httpResponseCode = http.POST(jsonPayload);
  
  bool success = (httpResponseCode == 201);
  
  if (success) {
    Serial.println("✓ Data sent successfully!");
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(httpResponseCode);
    Serial.println(http.getString());
  }
  
  http.end();
  return success;
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
}
```

---

## Additional Resources

- **Backend API Documentation:** See `backend/README.md`
- **Field Creation Guide:** See website dashboard documentation
- **ESP32 Documentation:** https://docs.espressif.com/projects/esp-idf/
- **Arduino JSON Library:** https://arduinojson.org/
- **DHT Sensor Library:** https://github.com/adafruit/DHT-sensor-library

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review backend logs: `backend/logs/` (if logging is enabled)
3. Check ESP32 Serial monitor for debug messages
4. Verify field configuration in the website dashboard

---

**Last Updated:** January 2024
**Version:** 1.0
