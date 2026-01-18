"""
Field Ownership Validation Utilities

Provides reusable functions for validating that farmers own the fields
they are trying to access. This ensures data isolation across the application.
"""

from fastapi import HTTPException, status
from typing import Optional
from models.schemas import FieldResponse
from services.storage import load_json


def validate_field_ownership(field_id: str, farmer_id: str) -> Optional[FieldResponse]:
    """
    Validate that a field belongs to the specified farmer.
    
    Args:
        field_id: The field ID to validate
        farmer_id: The farmer/user ID to check ownership against
    
    Returns:
        FieldResponse if field exists and belongs to farmer, None otherwise
    
    Note:
        Returns None (not raises exception) to allow callers to decide
        how to handle authorization failures (e.g., 404 vs 403).
    """
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    # Find field by ID
    field = next(
        (f for f in fields if f.get("field_id") == field_id),
        None
    )
    
    if field is None:
        return None
    
    # Check ownership
    if field.get("farmer_id") != farmer_id:
        return None
    
    return FieldResponse(**field)


def get_field_or_404(field_id: str, farmer_id: str) -> FieldResponse:
    """
    Get a field and validate ownership, raising HTTPException if not found or not owned.
    
    This function provides a consistent way to validate field ownership
    across all routes. It returns 404 for both non-existent fields and
    fields owned by other farmers to avoid information leakage.
    
    Args:
        field_id: The field ID to retrieve
        farmer_id: The farmer/user ID to validate ownership
    
    Returns:
        FieldResponse if field exists and belongs to farmer
    
    Raises:
        HTTPException 404: If field doesn't exist or doesn't belong to farmer
    """
    field = validate_field_ownership(field_id, farmer_id)
    
    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )
    
    return field


def get_farmer_field_ids(farmer_id: str) -> set:
    """
    Get all field IDs owned by a farmer.
    
    Useful for filtering queries across multiple endpoints.
    
    Args:
        farmer_id: The farmer/user ID
    
    Returns:
        Set of field IDs owned by the farmer
    """
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    return {
        field.get("field_id")
        for field in fields
        if field.get("farmer_id") == farmer_id
    }


def validate_sensor_node_belongs_to_farmer(sensor_node_id: str, farmer_id: str) -> bool:
    """
    Validate that a sensor_node_id belongs to a field owned by the farmer.
    
    Used for sensor data POST endpoint validation.
    
    Args:
        sensor_node_id: The sensor node ID to validate
        farmer_id: The farmer/user ID to check ownership against
    
    Returns:
        True if sensor_node_id belongs to a field owned by the farmer, False otherwise
    """
    fields_data = load_json("fields.json")
    fields = fields_data.get("fields", [])
    
    # Check if any field owned by farmer has this sensor_node_id
    return any(
        field.get("sensor_node_id") == sensor_node_id 
        and field.get("farmer_id") == farmer_id
        for field in fields
    )
