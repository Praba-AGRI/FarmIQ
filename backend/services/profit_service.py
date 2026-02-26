import json
import os
from typing import Dict
from models.schemas import ProfitEstimation
from services.market_service import predict_harvest_price

# Generic Yields (Tonnes per acre)
YIELDS = {
    "rice": 2.5,
    "wheat": 1.5,
    "maize": 3.0,
    "tomato": 10.0,
    "default": 2.0
}

# Generic Costs per acre (Local Units)
COSTS = {
    "irrigation": 5000,
    "fertilizer": 8000,
    "pest": 4000,
    "labour": 10000
}

def calculate_expected_profit(farmer_id: str, crop: str, district: str, area_acres: float) -> ProfitEstimation:
    crop_lower = crop.lower()
    
    # Get forecasted price
    # We'll assume a harvest date 3 months from now for estimation if not provided
    forecasted_price = predict_harvest_price(crop, district, "2024-06-01")
    
    # Predicted Yield
    yield_per_acre = YIELDS.get(crop_lower, YIELDS["default"])
    total_yield_kg = yield_per_acre * area_acres * 1000
    
    estimated_revenue = total_yield_kg * forecasted_price
    
    # Costs
    irrigation_cost = COSTS["irrigation"] * area_acres
    fertilizer_cost = COSTS["fertilizer"] * area_acres
    pest_cost = COSTS["pest"] * area_acres
    labour_cost = COSTS["labour"] * area_acres
    
    estimated_cost = irrigation_cost + fertilizer_cost + pest_cost + labour_cost
    
    net_profit = estimated_revenue - estimated_cost
    
    # Profit Score (0-100)
    # Simple score based on profit margin
    if estimated_revenue > 0:
        margin = (net_profit / estimated_revenue) * 100
        profit_score = max(0, min(100, int(margin + 50))) # Centered around 50
    else:
        profit_score = 0
        
    return ProfitEstimation(
        estimated_revenue=round(estimated_revenue, 2),
        estimated_cost=round(estimated_cost, 2),
        net_profit=round(net_profit, 2),
        profit_score=profit_score
    )
