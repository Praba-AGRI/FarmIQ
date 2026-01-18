from fastapi import APIRouter, Query, Depends
from typing import List, Optional

from models.schemas import AdvisoryResponse
from routes.auth import get_current_user
from services.storage import load_json
from utils.helpers import parse_datetime, filter_by_date_range
from utils.field_validation import get_farmer_field_ids, get_field_or_404

router = APIRouter()


@router.get("", response_model=List[AdvisoryResponse])
async def get_advisory_history(
    field_id: Optional[str] = Query(None, description="Filter by field ID"),
    date_range: Optional[str] = Query(None, description="Filter by date range (24h, 7d, 30d)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get advisory history with optional filtering
    
    - **field_id**: Optional field ID filter
    - **date_range**: Optional time range filter (24h, 7d, or 30d)
    - Returns timeline of past recommendations/advisories
    - Only returns advisories for fields owned by the authenticated farmer
    - Returns 404 if field_id is provided and field doesn't exist or doesn't belong to farmer
    """
    # Get all field IDs owned by the farmer
    farmer_field_ids = get_farmer_field_ids(current_user["user_id"])
    
    # If field_id is provided, validate ownership explicitly
    if field_id:
        # This will raise 404 if field doesn't exist or doesn't belong to farmer
        get_field_or_404(field_id, current_user["user_id"])
    
    advisories_data = load_json("advisories.json")
    advisories = advisories_data.get("advisories", [])
    
    # Filter advisories by farmer's fields
    filtered_advisories = [
        adv for adv in advisories
        if adv.get("field_id") in farmer_field_ids
    ]
    
    # Filter by field_id if provided (additional filtering for clarity)
    if field_id:
        filtered_advisories = [
            adv for adv in filtered_advisories
            if adv.get("field_id") == field_id
        ]
    
    # Filter by date range if provided
    if date_range:
        from utils.helpers import parse_time_range
        start_time, end_time = parse_time_range(date_range)
        
        filtered_advisories = filter_by_date_range(
            filtered_advisories,
            start_time,
            end_time
        )
    
    # Convert to response format
    result = []
    for adv in filtered_advisories:
        advisory_items = []
        for rec in adv.get("recommendations", []):
            advisory_items.append({
                "type": rec.get("type", "unknown"),
                "status": rec.get("status", "monitor"),
                "message": rec.get("message", "")
            })
        
        result.append(AdvisoryResponse(
            advisory_id=adv.get("advisory_id", ""),
            field_id=adv.get("field_id", ""),
            field_name=adv.get("field_name", ""),
            date=adv.get("date", ""),
            recommendations=advisory_items
        ))
    
    # Sort by date (newest first)
    result.sort(key=lambda x: x.date, reverse=True)
    
    return result




