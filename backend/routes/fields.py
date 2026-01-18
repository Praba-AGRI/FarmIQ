from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import uuid

from models.schemas import FieldCreate, FieldUpdate, FieldResponse
from routes.auth import get_current_user
from services.storage import load_json, save_json
from utils.field_validation import get_field_or_404, get_farmer_field_ids

router = APIRouter()


@router.get("", response_model=List[FieldResponse])
async def get_all_fields(current_user: dict = Depends(get_current_user)):
    """
    Get all fields for the current authenticated farmer
    
    - Only returns fields owned by the authenticated farmer
    """
    # Get all field IDs owned by the farmer
    farmer_field_ids = get_farmer_field_ids(current_user["user_id"])
    
    # Load fields and filter by owned IDs
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    farmer_fields = [
        field for field in fields
        if field.get("field_id") in farmer_field_ids
    ]
    
    return [FieldResponse(**field) for field in farmer_fields]


@router.post("", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field(
    field_data: FieldCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new field for the current farmer
    
    - **name**: Field name
    - **crop**: Crop name
    - **sowing_date**: Sowing date in YYYY-MM-DD format
    - **area_acres**: Field area in acres
    - **sensor_node_id**: Associated sensor node ID
    """
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    # Create new field
    field_id = str(uuid.uuid4())
    new_field = {
        "field_id": field_id,
        "farmer_id": current_user["user_id"],
        "name": field_data.name,
        "crop": field_data.crop,
        "sowing_date": field_data.sowing_date,
        "area_acres": field_data.area_acres,
        "sensor_node_id": field_data.sensor_node_id
    }
    
    fields.append(new_field)
    fields_data["fields"] = fields
    save_json("fields.json", fields_data)
    
    return FieldResponse(**new_field)


@router.get("/{field_id}", response_model=FieldResponse)
async def get_field(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific field by ID
    
    - Only returns field if it belongs to the current farmer
    - Returns 404 if field doesn't exist or doesn't belong to farmer
    """
    return get_field_or_404(field_id, current_user["user_id"])


@router.put("/{field_id}", response_model=FieldResponse)
async def update_field(
    field_id: str,
    field_update: FieldUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a field
    
    - Only provided fields will be updated
    - Only fields belonging to the current farmer can be updated
    - Returns 404 if field doesn't exist or doesn't belong to farmer
    """
    # Validate ownership (raises 404 if not owned)
    get_field_or_404(field_id, current_user["user_id"])
    
    # Update field
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    # Find field index
    field_index = None
    for i, field in enumerate(fields):
        if field.get("field_id") == field_id:
            field_index = i
            break
    
    # Update fields if provided
    update_data = field_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            fields[field_index][key] = value
    
    fields_data["fields"] = fields
    save_json("fields.json", fields_data)
    
    return FieldResponse(**fields[field_index])


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    field_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a field
    
    - Only fields belonging to the current farmer can be deleted
    - Returns 404 if field doesn't exist or doesn't belong to farmer
    """
    # Validate ownership (raises 404 if not owned)
    get_field_or_404(field_id, current_user["user_id"])
    
    # Delete field
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    # Remove field
    fields = [
        f for f in fields
        if f.get("field_id") != field_id
    ]
    
    fields_data["fields"] = fields
    save_json("fields.json", fields_data)
    
    return None




