from datetime import datetime, timedelta, timezone
from typing import Optional


def get_timestamp() -> str:
    """Get current timestamp in ISO format"""
    return datetime.now(timezone.utc).isoformat()


def parse_time_range(range_str: str) -> tuple[datetime, datetime]:
    """
    Parse time range string to start and end datetime objects
    
    Args:
        range_str: Time range string ("24h", "7d", "30d")
    
    Returns:
        Tuple of (start_datetime, end_datetime)
    """
    end_time = datetime.now(timezone.utc)
    
    if range_str == "24h":
        start_time = end_time - timedelta(hours=24)
    elif range_str == "7d":
        start_time = end_time - timedelta(days=7)
    elif range_str == "30d":
        start_time = end_time - timedelta(days=30)
    else:
        # Default to 24h
        start_time = end_time - timedelta(hours=24)
    
    return start_time, end_time


def filter_by_date_range(data: list[dict], start: datetime, end: datetime) -> list[dict]:
    """
    Filter data by date range
    
    Args:
        data: List of dictionaries with 'timestamp' field
        start: Start datetime
        end: End datetime
    
    Returns:
        Filtered list of dictionaries
    """
    filtered = []
    for item in data:
        try:
            timestamp_str = item.get('timestamp', '')
            if timestamp_str:
                item_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                # Convert to UTC naive for comparison
                if item_time.tzinfo:
                    item_time = item_time.replace(tzinfo=None)
                
                if start <= item_time <= end:
                    filtered.append(item)
        except (ValueError, KeyError):
            continue
    
    return filtered


def parse_datetime(date_str: str) -> Optional[datetime]:
    """Parse datetime string to datetime object"""
    try:
        # Try ISO format first
        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        try:
            # Try common formats
            return datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return None




