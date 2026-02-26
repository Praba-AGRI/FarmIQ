from fastapi import APIRouter, Depends, HTTPException
from routes.auth import get_current_user
from services.community_service import get_community_insights
from models.schemas import CommunityInsights

router = APIRouter()

@router.get("/insights", response_model=CommunityInsights)
async def get_community_data(
    radius_km: float = 15.0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get community clustering and crop distribution insights
    """
    # Assuming the current_user is a farmer and we use their ID
    # In a real app, we'd fetch the farmer_id associated with the user
    # For now, we'll use a mapping or mock ID if needed
    # Let's check if the current_user dict has farmer_id
    
    farmer_id = current_user.get("user_id") # Using user_id as farmer_id for simplicity 
    # but our mock farmers have IDs like farmer_001
    
    # Map for mock testing:
    mock_farmer_map = {
        "user_001": "farmer_001", # Assuming Rajesh Kumar is user_001
    }
    
    actual_farmer_id = mock_farmer_map.get(farmer_id, "farmer_001")
    
    try:
        insights = get_community_insights(actual_farmer_id, radius_km)
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
