import pandas as pd
import numpy as np
import random

num_samples = 2000
spray_data = []

for _ in range(num_samples):
    # Simulate realistic daily microclimate variations
    temp = round(random.uniform(20.0, 40.0), 1)
    humidity = round(random.uniform(40.0, 99.0), 1)
    wind_speed = round(random.uniform(0.0, 25.0), 1)
    
    # The Physics & Safety Logic (These map to the rules in your API)
    if wind_speed > 12.0:
        decision = "Not Safe to Spray"
        reason = "High Wind (Drift Hazard)"
    elif temp > 33.0:
        decision = "Not Safe to Spray"
        reason = "High Temp (Evaporation Hazard)"
    elif humidity > 85.0:
        decision = "Not Safe to Spray"
        reason = "Too humid, risk of runoff/dilution"
    else:
        decision = "Safe to Spray"
        reason = "Optimal Conditions"

    spray_data.append([temp, humidity, wind_speed, decision, reason])

# Export to CSV
df_spray = pd.DataFrame(spray_data, columns=[
    'Temperature_C', 'Humidity_pct', 'Wind_Speed_kmh', 'Spray_Decision', 'Reason'
])

df_spray.to_csv('spraying_data.csv', index=False)
print(f"Successfully generated spraying_data.csv with {len(df_spray)} rows for system validation!")
