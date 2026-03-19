from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from services.market_service import get_market_price, load_market_prices
from services.profit_service import calculate_expected_profit
from services.advisory_service import generate_market_community_advisory
from services.storage import load_json
from models.schemas import MarketPrice, ProfitEstimation, MarketAdvisory
from typing import List

router = APIRouter()

@router.get("/prices", response_model=List[MarketPrice])
async def get_all_prices(current_user: dict = Depends(get_current_user)):
    """Get all available market prices"""
    try:
        prices = load_market_prices()
        return [MarketPrice(**{k: v for k, v in p.items() if k != 'price_history'}) for p in prices]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/prices/{crop_name}/history")
async def get_price_history(crop_name: str, current_user: dict = Depends(get_current_user)):
    """Get 30-day daily price history for a specific crop"""
    prices = load_market_prices()
    crop_data = next((p for p in prices if p["crop_name"].lower() == crop_name.lower()), None)
    if not crop_data:
        raise HTTPException(status_code=404, detail=f"Crop '{crop_name}' not found")
    return {"crop_name": crop_data["crop_name"], "price_history": crop_data.get("price_history", [])}


@router.get("/profit-estimation/{field_id}", response_model=ProfitEstimation)
async def get_profit_estimation(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Estimate profitability for a specific field
    """
    # Load field data to get crop, area, and location
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    field = next((f for f in fields if f["field_id"] == field_id), None)
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    farmer_id = current_user.get("user_id")
    district = "Coimbatore" # Default if not in field data
    
    try:
        profit = calculate_expected_profit(
            farmer_id, 
            field["crop"], 
            district, 
            field["area_acres"]
        )
        return profit
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from services.market_integration import MarketIntegrationModule

market_module = MarketIntegrationModule()

@router.get("/advisory/{field_id}", response_model=MarketAdvisory)
async def get_market_advisory(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get real-time market-aware advisory for a specific field.
    Integrates live data from data.gov.in and economic calculations.
    """
    fields_data = load_json("fields.json")
    field = next((f for f in fields_data.get("fields", []) if f["field_id"] == field_id), None)
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    crop = field.crop
    state = "Tamil Nadu" # Can be dynamic based on farmer profile
    
    # 1. Fetch real-time market price
    market_data = market_module.fetch_market_prices(state=state, commodity=crop)
    price_per_q = market_data.get("modal_price", 2500.0)
    
    # 2. Calculate Economics
    # Mocking days to harvest for now, can be derived from GDD/Stage later
    days_to_harvest = 30 
    econ = market_module.calculate_economics(crop, field["area_acres"], days_to_harvest, price_per_q)
    
    # 3. Construct Advisory
    return MarketAdvisory(
        recommended_crop=crop,
        community_density="Low", # Can be calculated from nearby fields
        market_demand=MarketDemandIndex.HIGH_DEMAND if price_per_q > 2400 else MarketDemandIndex.MODERATE_DEMAND,
        expected_profit=econ["estimated_revenue"],
        risk_level="Low" if market_data.get("trend") == "up" else "Moderate",
        reasoning_summary=f"Market price for {crop} is currently ₹{price_per_q}/quintal at {market_data.get('market', 'Local')} market. {econ['market_advice']}. Estimated yield: {econ['estimated_yield_quintals']} quintals."
    )
