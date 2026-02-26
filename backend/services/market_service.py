import json
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from models.schemas import MarketPrice, MarketDemandIndex

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "market_prices.json")

def load_market_prices() -> List[Dict]:
    if not os.path.exists(DB_PATH):
        return []
    with open(DB_PATH, 'r') as f:
        return json.load(f)

def get_market_price(crop: str, district: str) -> Optional[MarketPrice]:
    prices = load_market_prices()
    for p in prices:
        if p["crop_name"].lower() == crop.lower() and p["district"].lower() == district.lower():
            return MarketPrice(**p)
    return None

def calculate_market_demand_index(crop: str, district: str, regional_crop_density: float) -> MarketDemandIndex:
    price_data = get_market_price(crop, district)
    if not price_data:
        return MarketDemandIndex.MODERATE_DEMAND

    # MDI Components (0-100 scale)
    
    # 1. Price Trend (40%) - rising = 100, stable = 50, falling = 20
    trend_score = 0
    if price_data.demand_trend == "rising":
        trend_score = 100
    elif price_data.demand_trend == "stable":
        trend_score = 50
    else:
        trend_score = 20
    
    # 2. Volatility Stability (25%) - lower volatility is better stability
    # volatility_index is 0.0 to 1.0. We want inverse.
    stability_score = (1 - price_data.volatility_index) * 100
    
    # 3. Seasonal Performance (20%) - current price vs seasonal avg
    if price_data.seasonal_avg > 0:
        seasonal_ratio = price_data.current_price / price_data.seasonal_avg
        seasonal_score = min(seasonal_ratio * 50, 100) # Cap at 100
    else:
        seasonal_score = 50
        
    # 4. Regional Crop Density Inverse (15%) - lower density = higher demand
    # density is percentage (0-100)
    density_score = (100 - regional_crop_density)
    
    mdi_value = (0.40 * trend_score) + (0.25 * stability_score) + (0.20 * seasonal_score) + (0.15 * density_score)
    
    if mdi_value > 70:
        return MarketDemandIndex.HIGH_DEMAND
    elif mdi_value < 40:
        return MarketDemandIndex.OVERSUPPLY_RISK
    else:
        return MarketDemandIndex.MODERATE_DEMAND

def predict_harvest_price(crop: str, district: str, expected_harvest_date: str) -> float:
    price_data = get_market_price(crop, district)
    if not price_data:
        return 0.0

    # Simplified Moving average + Seasonal trend factor
    # For now, we'll just use current_price adjusted by demand_trend
    base_price = price_data.current_price
    
    adjustment = 1.0
    if price_data.demand_trend == "rising":
        adjustment = 1.05 # 5% increase expected
    elif price_data.demand_trend == "falling":
        adjustment = 0.90 # 10% decrease expected
        
    # Seasonal factor: if it's currently below seasonal avg, we expect it to revert
    if price_data.current_price < price_data.seasonal_avg:
        adjustment += 0.02
        
    return round(base_price * adjustment, 2)
