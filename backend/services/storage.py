import json
import csv
import os
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


# Base data directory
DATA_DIR = Path(__file__).parent.parent / "data"
SENSORS_DIR = DATA_DIR / "sensors"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
SENSORS_DIR.mkdir(exist_ok=True)


def load_json(file_path: str) -> dict:
    """
    Load JSON data from file
    
    Args:
        file_path: Path to JSON file (relative to data directory)
    
    Returns:
        Dictionary with data, or empty dict if file doesn't exist
    """
    full_path = DATA_DIR / file_path
    
    if not full_path.exists():
        return {}
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_json(file_path: str, data: dict) -> bool:
    """
    Save data to JSON file
    
    Args:
        file_path: Path to JSON file (relative to data directory)
        data: Dictionary to save
    
    Returns:
        True if successful, False otherwise
    """
    full_path = DATA_DIR / file_path
    
    try:
        # Ensure directory exists
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except IOError:
        return False


def append_csv(file_path: str, row: dict) -> bool:
    """
    Append a row to CSV file
    
    Args:
        file_path: Path to CSV file (relative to sensors directory)
        row: Dictionary with data to append
    
    Returns:
        True if successful, False otherwise
    """
    full_path = SENSORS_DIR / file_path
    
    try:
        # Ensure directory exists
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Check if file exists to determine if we need headers
        file_exists = full_path.exists()
        
        # Define fieldnames based on sensor data structure
        fieldnames = ['timestamp', 'air_temp', 'air_humidity', 'soil_temp', 'soil_moisture', 'light_lux', 'wind_speed']
        
        with open(full_path, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            
            if not file_exists:
                writer.writeheader()
            
            writer.writerow(row)
        return True
    except IOError:
        return False


def read_csv(file_path: str, filters: Optional[dict] = None) -> List[Dict]:
    """
    Read CSV file with optional filters
    
    Args:
        file_path: Path to CSV file (relative to sensors directory)
        filters: Optional dictionary with filter criteria
    
    Returns:
        List of dictionaries with CSV data
    """
    full_path = SENSORS_DIR / file_path
    
    if not full_path.exists():
        return []
    
    try:
        data = []
        with open(full_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Apply filters if provided
                if filters:
                    match = True
                    for key, value in filters.items():
                        if key in row and str(row[key]) != str(value):
                            match = False
                            break
                    if not match:
                        continue
                
                # Convert numeric fields
                try:
                    row['air_temp'] = float(row.get('air_temp', 0))
                    row['air_humidity'] = float(row.get('air_humidity', 0))
                    row['soil_temp'] = float(row.get('soil_temp', 0))
                    row['soil_moisture'] = float(row.get('soil_moisture', 0))
                    row['light_lux'] = float(row.get('light_lux', 0))
                    if row.get('wind_speed'):
                        row['wind_speed'] = float(row.get('wind_speed', 0))
                except (ValueError, KeyError):
                    pass
                
                data.append(row)
        
        return data
    except IOError:
        return []


def get_latest_csv_row(file_path: str) -> Optional[Dict]:
    """
    Get the latest row from CSV file
    
    Args:
        file_path: Path to CSV file (relative to sensors directory)
    
    Returns:
        Dictionary with latest row data, or None if file is empty
    """
    data = read_csv(file_path)
    if data:
        return data[-1]  # Return last row
    return None


def get_csv_by_date_range(file_path: str, start: datetime, end: datetime) -> List[Dict]:
    """
    Get CSV rows within a date range
    
    Args:
        file_path: Path to CSV file (relative to sensors directory)
        start: Start datetime
        end: End datetime
    
    Returns:
        List of dictionaries filtered by date range
    """
    from utils.helpers import filter_by_date_range
    
    data = read_csv(file_path)
    return filter_by_date_range(data, start, end)




