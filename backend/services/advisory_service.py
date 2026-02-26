from models.schemas import MarketAdvisory, MarketDemandIndex
from services.community_service import get_community_insights
from services.market_service import calculate_market_demand_index, predict_harvest_price
from services.profit_service import calculate_expected_profit
from typing import List, Dict

def generate_market_community_advisory(farmer_id: str, crop: str, district: str, area_acres: float) -> MarketAdvisory:
    # 1. Get Community Insights
    community = get_community_insights(farmer_id)
    density = community.distribution.crop_distribution.get(crop.lower(), 0)
    dominant_crop = community.distribution.dominant_crop
    
    # 2. Get Market Demand Index
    mdi = calculate_market_demand_index(crop, district, density)
    
    # 3. Forecast Harvest Price
    # (Assuming harvest date in 3 months)
    forecasted_price = predict_harvest_price(crop, district, "2024-06-01")
    
    # 4. Profitability Estimation
    profit_data = calculate_expected_profit(farmer_id, crop, district, area_acres)
    
    # 5. Reasoning and Recommendation
    recommended_crop = crop # Default to current
    risk_level = "LOW"
    reasoning = []
    
    if community.distribution.oversupply_risk:
        risk_level = "HIGH"
        reasoning.append(f"High oversupply risk in your region as {density}% farmers are growing {crop}.")
        if mdi == MarketDemandIndex.OVERSUPPLY_RISK:
            reasoning.append("Market demand is also low. Consider diversifying your next crop.")
    
    if mdi == MarketDemandIndex.HIGH_DEMAND:
        reasoning.append(f"Market demand for {crop} is high with rising price trends.")
        if risk_level == "LOW":
            risk_level = "LOW"
    
    if profit_data.profit_score < 40:
        risk_level = "MODERATE"
        reasoning.append(f"Expected profit score is low ({profit_data.profit_score}/100) due to high costs or low price forecast.")

    if not reasoning:
        reasoning.append(f"Conditions for {crop} are stable. Market demand is moderate.")

    return MarketAdvisory(
        recommended_crop=recommended_crop.capitalize(),
        community_density=f"{density}%",
        market_demand=mdi,
        expected_profit=profit_data.net_profit,
        risk_level=risk_level,
        reasoning_summary=" ".join(reasoning)
    )
