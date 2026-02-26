import math
import json
import os
from typing import List, Dict
from models.schemas import Farmer, CropDistribution, CommunityInsights

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "farmers_data.json")

def load_farmers() -> List[Dict]:
    if not os.path.exists(DB_PATH):
        return []
    with open(DB_PATH, 'r') as f:
        return json.load(f)

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points 
    on the Earth in kilometers.
    """
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

def get_nearby_farmers(farmer_id: str, radius_km: float = 15.0) -> Dict:
    all_farmers = load_farmers()
    
    # Find the target farmer
    target_farmer = next((f for f in all_farmers if f["farmer_id"] == farmer_id), None)
    if not target_farmer:
        return {"nearby_farmers": [], "total_count": 0}

    nearby = []
    for f in all_farmers:
        if f["farmer_id"] == farmer_id:
            continue
        
        dist = haversine(target_farmer["latitude"], target_farmer["longitude"], f["latitude"], f["longitude"])
        if dist <= radius_km:
            nearby.append(f)
            
    return {
        "nearby_farmers": nearby,
        "total_count": len(nearby)
    }

def analyze_crop_distribution(region_farmers: List[Dict]) -> Dict:
    if not region_farmers:
        return {
            "crop_distribution": {},
            "dominant_crop": "None",
            "oversupply_risk": False
        }

    crop_counts = {}
    total = len(region_farmers)

    for f in region_farmers:
        crop = f.get("crop_current", "Unknown")
        crop_counts[crop] = crop_counts.get(crop, 0) + 1

    distribution = {crop: round((count / total) * 100, 2) for crop, count in crop_counts.items()}
    
    dominant_crop = max(crop_counts, key=crop_counts.get) if crop_counts else "None"
    oversupply_risk = distribution.get(dominant_crop, 0) > 60.0

    return {
        "crop_distribution": distribution,
        "dominant_crop": dominant_crop,
        "oversupply_risk": oversupply_risk
    }

def get_community_insights(farmer_id: str, radius_km: float = 15.0) -> CommunityInsights:
    nearby_data = get_nearby_farmers(farmer_id, radius_km)
    distribution_data = analyze_crop_distribution(nearby_data["nearby_farmers"])
    
    return CommunityInsights(
        nearby_farmers=[Farmer(**f) for f in nearby_data["nearby_farmers"]],
        total_count=nearby_data["total_count"],
        distribution=CropDistribution(**distribution_data)
    )
