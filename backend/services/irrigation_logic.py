import math

# ==========================================================
# 1️⃣ BASE TEMPERATURES (°C)
# ==========================================================
BASE_TEMP = {
    "rice": 10,
    "wheat": 5,
    "groundnut": 10,
    "sugarcane": 12
}

# ==========================================================
# 2️⃣ GDD THRESHOLDS
# ==========================================================
GDD_THRESHOLDS = {
    "rice": [
        (0, 300, "initial"),
        (300, 900, "vegetative"),
        (900, 1200, "flowering"),
        (1200, 2000, "maturity")
    ],
    "wheat": [
        (0, 200, "initial"),
        (200, 800, "vegetative"),
        (800, 1100, "flowering"),
        (1100, 1800, "maturity")
    ],
    "groundnut": [
        (0, 250, "initial"),
        (250, 700, "vegetative"),
        (700, 1100, "flowering"),
        (1100, 1600, "maturity")
    ],
    "sugarcane": [
        (0, 500, "initial"),
        (500, 2000, "vegetative"),
        (2000, 4000, "grand_growth"),
        (4000, 6000, "maturity")
    ]
}

# ==========================================================
# 3️⃣ CROP COEFFICIENTS (Kc)
# ==========================================================
KC_VALUES = {
    "rice": {"initial": 1.05, "vegetative": 1.10, "flowering": 1.20, "maturity": 0.90},
    "wheat": {"initial": 0.70, "vegetative": 1.05, "flowering": 1.15, "maturity": 0.80},
    "groundnut": {"initial": 0.60, "vegetative": 0.95, "flowering": 1.10, "maturity": 0.85},
    "sugarcane": {"initial": 0.40, "vegetative": 1.00, "flowering": 1.25, "maturity": 1.15}
}

# ==========================================================
# 4️⃣ DAILY GDD CALCULATION
# ==========================================================
def calculate_daily_gdd(tmax, tmin, crop):
    crop = crop.lower()
    base_temp = BASE_TEMP.get(crop, 10) # Default to 10 if crop not found

    # Limit unrealistic values
    tmax = min(tmax, 45)
    tmin = max(tmin, 0)

    avg_temp = (tmax + tmin) / 2
    gdd = avg_temp - base_temp

    return max(gdd, 0)


# ==========================================================
# 5️⃣ CUMULATIVE GDD
# ==========================================================
def calculate_cumulative_gdd(weather_history, crop):
    total_gdd = 0
    for day in weather_history:
        total_gdd += calculate_daily_gdd(
            day["tmax"],
            day["tmin"],
            crop
        )
    return round(total_gdd, 2)


# ==========================================================
# 6️⃣ STAGE ESTIMATION
# ==========================================================
def estimate_stage(crop, cumulative_gdd):
    crop = crop.lower()
    
    thresholds = GDD_THRESHOLDS.get(crop)
    if not thresholds:
        return "unknown", 50

    for lower, upper, stage in thresholds:
        if lower <= cumulative_gdd < upper:
            confidence = 85
            return stage, confidence

    return "unknown", 50


# ==========================================================
# 7️⃣ FAO-56 ET0 CALCULATOR (Penman-Monteith)
# ==========================================================
def calculate_et0(
    temp_avg,
    temp_max,
    temp_min,
    humidity,
    wind_speed,
    solar_radiation,
    altitude=100
):

    es = 0.6108 * math.exp((17.27 * temp_avg) / (temp_avg + 237.3))
    ea = es * (humidity / 100)

    delta = (4098 * es) / ((temp_avg + 237.3) ** 2)
    gamma = 0.665e-3 * (101.3 * ((293 - 0.0065 * altitude) / 293) ** 5.26)

    Rn = solar_radiation * 0.77
    G = 0

    et0 = (
        (0.408 * delta * (Rn - G) +
         gamma * (900 / (temp_avg + 273)) *
         wind_speed * (es - ea))
        /
        (delta + gamma * (1 + 0.34 * wind_speed))
    )

    return round(max(et0, 0), 2)


# ==========================================================
# 8️⃣ ETc CALCULATION
# ==========================================================
def calculate_etc(crop, stage, et0):
    crop = crop.lower()
    stage = stage.lower()
    
    crop_kc = KC_VALUES.get(crop, {})
    kc = crop_kc.get(stage, 1.0) # Default to 1.0 if not found
    
    etc = et0 * kc
    return round(etc, 2), kc


# ==========================================================
# 9️⃣ EFFECTIVE RAINFALL
# ==========================================================
def effective_rainfall(rain_mm):
    # Assume 70% effective
    return round(rain_mm * 0.7, 2)


# ==========================================================
# 🔟 IRRIGATION RECOMMENDATION ENGINE
# ==========================================================
def irrigation_recommendation(data):
    """
    data = {
        "crop": "rice",
        "weather_history": [{"tmax": 34, "tmin": 22}, ...],
        "temp_avg": 30,
        "temp_max": 34,
        "temp_min": 22,
        "humidity": 72,
        "wind_speed": 1.4,
        "solar_radiation": 20,
        "rainfall_last_3d": 5,
        "soil_moisture": 45
    }
    """

    crop = data["crop"].lower()
    
    # Handle unsupported crops
    if crop not in HEADER_MOISTURE_THRESHOLDS and crop not in KC_VALUES:
         # Use generic defaults if crop not specifically supported, or map to 'wheat'/'rice' etc if possible
         # For now, we proceed but might get defaults in sub-functions
         pass

    # 1️⃣ Calculate cumulative GDD
    cumulative_gdd = calculate_cumulative_gdd(
        data.get("weather_history", []),
        crop
    )

    # 2️⃣ Estimate stage
    stage, stage_conf = estimate_stage(
        crop,
        cumulative_gdd
    )
    
    # If using manual stage from input if available and GDD calc failed (e.g. no history)
    if stage == "unknown" and "stage" in data:
         stage = data["stage"]
         stage_conf = 60 # Lower confidence if manually specific/default

    # 3️⃣ Calculate ET0
    # Use defaults if keys missing
    temp_avg = data.get("temp_avg", 30)
    temp_max = data.get("temp_max", temp_avg + 5)
    temp_min = data.get("temp_min", temp_avg - 5)
    
    et0 = calculate_et0(
        temp_avg,
        temp_max,
        temp_min,
        data.get("humidity", 60),
        data.get("wind_speed", 2.0),
        data.get("solar_radiation", 15.0)
    )

    # 4️⃣ Calculate ETc
    etc, kc = calculate_etc(crop, stage, et0)

    # 5️⃣ Adjust for rainfall
    eff_rain = effective_rainfall(data.get("rainfall_last_3d", 0))

    # 6️⃣ Net irrigation
    # Simple soil moisture check override
    soil_moisture = data.get("soil_moisture", 50)
    if soil_moisture > 75:
        irrigation_mm = 0
    else:
        # Moisture deficit approach could be better, but sticking to user logic:
        # If moisture is low, we need to replenish ETc - Rain
        irrigation_mm = max(0, etc - eff_rain)

    irrigation_mm = round(irrigation_mm, 2)
    
    # Construct advisory message
    if irrigation_mm > 0:
        advisory = f"Apply {irrigation_mm} mm irrigation within next 24 hours."
    else:
        if soil_moisture > 75:
            advisory = "Soil moisture is sufficient. No irrigation needed."
        else:
            advisory = "No significant irrigation needed today."

    return {
        "crop": crop.capitalize(),
        "cumulative_gdd": cumulative_gdd,
        "estimated_stage": stage.capitalize(),
        "stage_confidence": stage_conf,
        "ET0_mm_day": et0,
        "Kc": kc,
        "ETc_mm_day": etc,
        "effective_rain_mm": eff_rain,
        "recommended_irrigation_mm": irrigation_mm,
        "advisory": advisory
    }

# Additional constants needed for crop validation/defaults if any
HEADER_MOISTURE_THRESHOLDS = {
    # generic placeholders
}
