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

@router.get("/advisory/{field_id}", response_model=MarketAdvisory)
async def get_market_advisory(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get market-aware advisory for a specific field
    """
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    field = next((f for f in fields if f["field_id"] == field_id), None)
    
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
        
    farmer_id = current_user.get("user_id")
    district = "Coimbatore"
    
    try:
        advisory = generate_market_community_advisory(
            farmer_id,
            field["crop"],
            district,
            field["area_acres"]
        )
        return advisory
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
