import pandas as pd
import numpy as np
import random

# 1. Configuration for Tamil Nadu Crops
crops = ["Rice", "Sugarcane", "Cotton", "Groundnut", "Maize"]
stages = ["Vegetative", "Flowering", "Yielding"]
seasons = ["Kharif", "Rabi", "Zaid"]
num_samples = 2000

pest_data = []

# 2. Generate the Biological Data
for _ in range(num_samples):
    crop = random.choice(crops)
    stage = random.choice(stages)
    season = random.choice(seasons)
    
    # Simulate realistic tropical weather patterns
    temp = round(random.uniform(22.0, 40.0), 1)
    humidity = round(random.uniform(40.0, 98.0), 1)
    
    # 3. Pathogen Environment Logic (The "Rules" the AI will learn)
    disease_class = "Healthy_Low_Risk" # Default state
    
    # Rice Blast: Thrives in high humidity and moderate temps
    if crop == "Rice" and humidity > 85 and 25 <= temp <= 30:
        disease_class = "High_Risk_Rice_Blast"
        
    # Bacterial Blight: Thrives in high heat and high humidity
    elif crop == "Rice" and humidity > 80 and temp > 32:
        disease_class = "High_Risk_Bacterial_Blight"
        
    # Whitefly (Cotton): Thrives in hot, dry spells
    elif crop == "Cotton" and humidity < 60 and temp > 32:
        disease_class = "High_Risk_Whitefly"
        
    # Red Rot (Sugarcane): Thrives in heavy monsoon (Kharif) humidity
    elif crop == "Sugarcane" and humidity > 90 and season == "Kharif":
        disease_class = "High_Risk_Red_Rot"
        
    # Tikka Disease (Groundnut): Thrives in warm, humid conditions
    elif crop == "Groundnut" and temp > 30 and humidity > 75:
        disease_class = "High_Risk_Tikka_Disease"
        
    pest_data.append([crop, stage, season, temp, humidity, disease_class])

# 4. Export to CSV
df_pest = pd.DataFrame(pest_data, columns=[
    'Crop_Type', 'Crop_Stage', 'Season', 'Temperature_C', 'Humidity_pct', 'Disease_Risk_Label'
])

df_pest.to_csv('pest_data.csv', index=False)
print(f"Successfully generated pest_data.csv with {len(df_pest)} rows!")
