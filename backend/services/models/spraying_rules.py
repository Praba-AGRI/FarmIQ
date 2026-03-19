class SprayingDecisionEngine:
    """
    Rule-Based Engine for Spraying Decision
    Inputs: Real-time Wind Speed, Humidity
    Output: Boolean or categorical "Safe to Spray" / "Not Safe to Spray"
    """
    def __init__(self, max_wind_speed=12.0, max_temp=33.0, min_humidity=40.0, max_humidity=85.0):
        self.max_wind_speed = max_wind_speed
        self.max_temp = max_temp
        self.min_humidity = min_humidity
        self.max_humidity = max_humidity
        
    def evaluate(self, wind_speed, humidity, temp=25.0):
        if wind_speed > self.max_wind_speed:
            return "Not Safe to Spray (High Wind - Drift Hazard)"
        elif temp > self.max_temp:
            return "Not Safe to Spray (High Temp - Evaporation Hazard)"
        elif humidity < self.min_humidity:
            return "Not Safe to Spray (Too dry, poor absorption)"
        elif humidity > self.max_humidity:
            return "Not Safe to Spray (Too humid, risk of runoff/dilution)"
        
        return "Safe to Spray"
