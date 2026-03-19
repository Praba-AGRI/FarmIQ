import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# 1. Tamil Nadu Multi-Crop Agronomic Configurations
crop_configs = {
    "Rice":      {"cycle": 120, "base_t": 10, "kc_init": 1.05, "kc_mid": 1.20, "kc_late": 0.90, "irrigation_threshold": 40},
    "Sugarcane": {"cycle": 365, "base_t": 10, "kc_init": 0.40, "kc_mid": 1.25, "kc_late": 0.75, "irrigation_threshold": 50},
    "Cotton":    {"cycle": 150, "base_t": 15, "kc_init": 0.35, "kc_mid": 1.15, "kc_late": 0.70, "irrigation_threshold": 30},
    "Groundnut": {"cycle": 120, "base_t": 10, "kc_init": 0.40, "kc_mid": 1.15, "kc_late": 0.60, "irrigation_threshold": 40},
    "Maize":     {"cycle": 110, "base_t": 10, "kc_init": 0.30, "kc_mid": 1.20, "kc_late": 0.50, "irrigation_threshold": 45}
}

start_date = datetime(2025, 6, 1) # Start of Kharif season
all_data = []

# 2. Generate Data for Each Crop
for crop_name, config in crop_configs.items():
    cumulative_gdd = 0
    current_moisture = 85.0 
    
    for day in range(config["cycle"]):
        date = start_date + timedelta(days=day)
        
        # Simulate Tropical Weather
        t_max = np.random.normal(34.0, 1.5)
        t_min = np.random.normal(25.0, 1.0)
        if t_min >= t_max: t_min = t_max - 2.0
        t_avg = (t_max + t_min) / 2
        
        humidity = np.clip(np.random.normal(75, 5) - (t_max - 34) * 2, 50, 95)
        light_intensity = np.clip(np.random.normal(65000, 5000), 40000, 100000)
        
        # Agronomic Math (GDD & ET0)
        gdd_daily = max(0, t_avg - config["base_t"]) 
        cumulative_gdd += gdd_daily
        et0 = 0.0023 * (t_avg + 17.8) * ((t_max - t_min) ** 0.5) * 15
        
        # Determine Crop Stage based on percentage of cycle length
        progress = day / config["cycle"]
        if progress < 0.20:
            stage = "Vegetative"
            kc = config["kc_init"]
        elif progress < 0.70:
            stage = "Flowering"
            kc = config["kc_mid"]
        else:
            stage = "Yielding"
            kc = config["kc_late"]
            
        etc = et0 * kc
        
        # Soil Moisture Dynamics
        moisture_drop = (etc * 0.4) + np.random.uniform(0.5, 1.2)
        current_moisture -= moisture_drop
        
        irrigation_event = 0
        if current_moisture < config["irrigation_threshold"]:
            current_moisture = 85.0 
            irrigation_event = 1
            
        all_data.append([
            date.strftime('%Y-%m-%d'), crop_name, stage, round(t_max, 1), round(t_min, 1), 
            round(t_avg, 1), round(humidity, 1), round(light_intensity, 0), round(cumulative_gdd, 1), 
            round(et0, 2), round(etc, 2), irrigation_event, round(current_moisture, 1)
        ])

# 3. Export Consolidated Dataset
df = pd.DataFrame(all_data, columns=[
    'Date', 'Crop_Type', 'Crop_Stage', 'T_Max', 'T_Min', 'T_Avg', 'Humidity', 'Light_Intensity', 
    'GDD_Cumulative', 'ET0', 'ETc', 'Irrigation_Event', 'Soil_Moisture'
])

df.to_csv('tn_multicrop_ag_dataset.csv', index=False)
print(f"Generated {len(df)} rows of data across 5 crop types!")
