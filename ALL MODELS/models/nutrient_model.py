from sklearn.ensemble import RandomForestRegressor

class NutrientRecommendationModel:
    def __init__(self):
        """
        Inputs: Crop Stage, Type of Crop, Field Size
        Output: Continuous exact amount for N, P, K in kg
        """
        # Multi-output capable Random Forest Regressor
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
