"""
Location Utility Functions

Coordinate validation and location formatting utilities.
"""

from typing import Tuple, Optional


def validate_coordinates(lat: float, lon: float) -> Tuple[bool, Optional[str]]:
    """
    Validate latitude and longitude coordinates.
    
    Args:
        lat: Latitude (-90 to 90)
        lon: Longitude (-180 to 180)
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(lat, (int, float)):
        return False, "Latitude must be a number"
    
    if not isinstance(lon, (int, float)):
        return False, "Longitude must be a number"
    
    if lat < -90 or lat > 90:
        return False, "Latitude must be between -90 and 90"
    
    if lon < -180 or lon > 180:
        return False, "Longitude must be between -180 and 180"
    
    return True, None


def format_location_string(location_name: str, country: Optional[str] = None) -> str:
    """
    Format location string for display.
    
    Args:
        location_name: Location name
        country: Optional country code/name
        
    Returns:
        Formatted location string
    """
    if not location_name:
        return "Unknown Location"
    
    if country:
        return f"{location_name}, {country}"
    
    return location_name


def round_coordinates(lat: float, lon: float, decimals: int = 4) -> Tuple[float, float]:
    """
    Round coordinates to specified decimal places.
    
    Args:
        lat: Latitude
        lon: Longitude
        decimals: Number of decimal places
        
    Returns:
        Tuple of (rounded_lat, rounded_lon)
    """
    return round(lat, decimals), round(lon, decimals)