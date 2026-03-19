import pandas as pd
import random

num_samples = 2000

# Approximate GDD thresholds for Tamil Nadu crops (Vegetative End, Flowering End)
gdd_thresholds = {
    "Rice": {"veg_end": 600, "flow_end": 1200, "max_gdd": 1800},
    "Sugarcane": {"veg_end": 1500, "flow_end": 3000, "max_gdd": 4500},
    "Cotton": {"veg_end": 700, "flow_end": 1400, "max_gdd": 2200},
    "Groundnut": {"veg_end": 500, "flow_end": 1000, "max_gdd": 1600},
    "Maize": {"veg_end": 550, "flow_end": 1100, "max_gdd": 1700}
}

gdd_data = []

for _ in range(num_samples):
    crop = random.choice(list(gdd_thresholds.keys()))
    thresholds = gdd_thresholds[crop]
    
    # Generate a random cumulative GDD value between 0 and the crop's max
    current_gdd = round(random.uniform(0, thresholds["max_gdd"]), 1)
    
    # Agronomic Logic: Assign the correct biological stage
    if current_gdd <= thresholds["veg_end"]:
        stage = "Vegetative"
    elif current_gdd <= thresholds["flow_end"]:
        stage = "Flowering"
    else:
        stage = "Yielding"
        
    gdd_data.append([crop, current_gdd, stage])

# Export to CSV
df_gdd = pd.DataFrame(gdd_data, columns=['Crop_Type', 'Cumulative_GDD', 'Crop_Stage'])
df_gdd.to_csv('gdd_stage_data.csv', index=False)
print(f"Successfully generated gdd_stage_data.csv with {len(df_gdd)} rows!")
