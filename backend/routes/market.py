from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from services.market_service import get_market_price, load_market_prices
from services.profit_service import calculate_expected_profit
from services.agronomic_engine import enrich_telemetry_history
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
    try:
        fields_data = load_json("fields.json")
        field_dict = next((f for f in fields_data.get("fields", []) if f["field_id"] == field_id), None)
        
        if not field_dict:
            raise HTTPException(status_code=404, detail="Field not found")
            
        from models.schemas import FieldResponse, AdvisoryMetric, MarketAdvisoryMetrics
        field = FieldResponse(**field_dict)
        
        # Get farmer location
        users_data = load_json("users.json")
        user = next((u for u in users_data.get("users", []) if u["user_id"] == current_user["user_id"]), {})
        farmer_location = user.get("location", "")
        district = farmer_location.split(',')[0].strip() if farmer_location else "Coimbatore"
        
        # 1. Fetch Agronomic Context (GDD)
        cumulative_gdd = 800.0 # Default fallback
        try:
            _, gdd, _ = await enrich_telemetry_history(field, farmer_location)
            cumulative_gdd = gdd
        except Exception as agronomic_err:
            print(f"Agronomic fetch failed for advisory: {agronomic_err}")
        
        # 2. Fetch Market Context & Forecast
        market_forecast = market_module.get_price_forecast(field.crop, district)
        current_price = market_forecast.get("current_price", 2400)
        
        # 3. Specific Biological & Economic Math (User Requirement)
        required_gdd = 1400.0 # Standard for Rice maturity
        maturity_percentage = min(int((cumulative_gdd / required_gdd) * 100), 100)
        
        # Specific Yield: 22 quintals per acre
        est_yield_quintals = round(field.area_acres * 22.0, 2)
        est_gross_revenue = est_yield_quintals * current_price
        est_costs = est_gross_revenue * 0.25 
        est_net_profit = int(est_gross_revenue - est_costs)

        market_demand = "Stable"
        demand_badge = "MODERATE DEMAND"
        risk_level = "Verified"
        risk_badge = "YELLOW RISK"
        
        # 4. Construct Nested UI Payload
        return MarketAdvisory(
            recommended_crop=field.crop.upper(),
            metrics=MarketAdvisoryMetrics(
                community_density=AdvisoryMetric(value="16.7%", tag="REGIONAL"),
                market_demand=AdvisoryMetric(value=market_demand, tag=demand_badge),
                est_net_profit=AdvisoryMetric(value=f"₹{est_net_profit:,}", tag=""),
                risk_assessment=AdvisoryMetric(value=risk_level, tag=risk_badge)
            ),
            reasoning_summary=f"Crop is at {maturity_percentage}% maturity. Prices are {market_demand.lower()}. Estimated yield: {est_yield_quintals} quintals."
        )
    except Exception as e:
        print(f"CRITICAL: Market Advisory failure: {e}")
        from models.schemas import AdvisoryMetric, MarketAdvisoryMetrics
        return MarketAdvisory(
            recommended_crop="ANALYSIS PENDING",
            metrics=MarketAdvisoryMetrics(
                community_density=AdvisoryMetric(value="--", tag="ERROR"),
                market_demand=AdvisoryMetric(value="--", tag="ERROR"),
                est_net_profit=AdvisoryMetric(value="₹0", tag=""),
                risk_assessment=AdvisoryMetric(value="--", tag="ERROR")
            ),
            reasoning_summary=f"Analysis engine failed: {str(e)}"
        )
