import pandas as pd
import numpy as np
import random

# 1. Define the parameters
crops = ["Rice", "Sugarcane", "Cotton", "Groundnut", "Maize"]
stages = ["Vegetative", "Flowering", "Yielding"]
num_samples = 1500

# 2. Agronomic Baselines (Standard kg/acre requirement for each stage)
# Format: "Crop": {"Stage": (N_kg_per_acre, P_kg_per_acre, K_kg_per_acre)}
base_npk_rules = {
    "Rice": {
        "Vegetative": (24.0, 20.0, 10.0), # Basal + early tillering
        "Flowering":  (12.0, 0.0, 10.0),  # Panicle initiation
        "Yielding":   (12.0, 0.0, 0.0)    # Heading
    },
    "Sugarcane": {
        "Vegetative": (45.0, 25.0, 15.0),
        "Flowering":  (45.0, 0.0, 15.0),
        "Yielding":   (20.0, 0.0, 15.0)
    },
    "Cotton": {
        "Vegetative": (16.0, 12.0, 12.0),
        "Flowering":  (12.0, 0.0, 6.0),
        "Yielding":   (12.0, 0.0, 6.0)
    },
    "Groundnut": {
        "Vegetative": (4.0, 14.0, 20.0),  # Legumes need less N, more P & K
        "Flowering":  (0.0, 0.0, 10.0),
        "Yielding":   (0.0, 0.0, 0.0)
    },
    "Maize": {
        "Vegetative": (25.0, 15.0, 10.0),
        "Flowering":  (25.0, 0.0, 10.0),
        "Yielding":   (0.0, 0.0, 0.0)
    }
}

nut_data = []

# 3. Generate the specific field data
for _ in range(num_samples):
    crop = random.choice(crops)
    stage = random.choice(stages)
    # Field sizes between 0.5 acres (smallholder) and 5.0 acres
    field_size_acres = round(random.uniform(0.5, 5.0), 2) 
    
    # Fetch base requirement per acre
    base_n, base_p, base_k = base_npk_rules[crop][stage]
    
    # Calculate exact requirement for the user's specific field size
    # Adding a tiny bit of random noise (0-5%) to simulate real-world data variance for the AI to learn
    req_n = round((base_n * field_size_acres) * random.uniform(0.98, 1.02), 1)
    req_p = round((base_p * field_size_acres) * random.uniform(0.98, 1.02), 1)
    req_k = round((base_k * field_size_acres) * random.uniform(0.98, 1.02), 1)

    nut_data.append([crop, stage, field_size_acres, req_n, req_p, req_k])

# 4. Export to CSV
df_nut = pd.DataFrame(nut_data, columns=[
    'Crop_Type', 'Crop_Stage', 'Field_Size_Acres', 
    'Target_N_kg', 'Target_P_kg', 'Target_K_kg'
])

df_nut.to_csv('simplified_nutrient_data.csv', index=False)
print("Simplified NPK calculation dataset generated successfully!")
