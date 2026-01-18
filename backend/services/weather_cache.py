"""
Weather Data Caching Service

In-memory TTL-based cache for weather data to reduce API calls
and improve response times.
"""

from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict


class WeatherCache:
    """
    In-memory cache with TTL support for weather data.
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = defaultdict(dict)
        self._ttls: Dict[str, int] = {
            "live": 600,      # 10 minutes
            "history": 86400,  # 24 hours
            "summary": 600,    # 10 minutes
            "alerts": 300      # 5 minutes
        }
    
    def _generate_cache_key(self, cache_type: str, lat: float, lon: float, extra: Optional[str] = None) -> str:
        """
        Generate a cache key based on location and optional extra parameters.
        
        Args:
            cache_type: Type of cache (live, history, summary, alerts)
            lat: Latitude
            lon: Longitude
            extra: Optional extra parameter (e.g., date for history)
            
        Returns:
            Cache key string
        """
        # Round coordinates to 2 decimal places for cache efficiency
        lat_rounded = round(lat, 2)
        lon_rounded = round(lon, 2)
        
        key = f"{cache_type}:{lat_rounded}:{lon_rounded}"
        if extra:
            key += f":{extra}"
        
        return key
    
    def get(self, cache_type: str, lat: float, lon: float, extra: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get cached weather data if it exists and hasn't expired.
        
        Args:
            cache_type: Type of cache (live, history, summary, alerts)
            lat: Latitude
            lon: Longitude
            extra: Optional extra parameter
            
        Returns:
            Cached data if valid, None otherwise
        """
        key = self._generate_cache_key(cache_type, lat, lon, extra)
        
        if key not in self._cache:
            return None
        
        cached_item = self._cache[key]
        cached_time = cached_item.get("cached_at")
        
        if not cached_time:
            return None
        
        # Check if cache has expired
        ttl_seconds = self._ttls.get(cache_type, 600)
        expiry_time = cached_time + timedelta(seconds=ttl_seconds)
        
        if datetime.now() > expiry_time:
            # Cache expired, remove it
            del self._cache[key]
            return None
        
        return cached_item.get("data")
    
    def set(self, cache_type: str, lat: float, lon: float, data: Dict[str, Any], extra: Optional[str] = None) -> None:
        """
        Store weather data in cache with appropriate TTL.
        
        Args:
            cache_type: Type of cache (live, history, summary, alerts)
            lat: Latitude
            lon: Longitude
            data: Data to cache
            extra: Optional extra parameter
        """
        key = self._generate_cache_key(cache_type, lat, lon, extra)
        
        self._cache[key] = {
            "data": data,
            "cached_at": datetime.now()
        }
    
    def clear(self, cache_type: Optional[str] = None) -> None:
        """
        Clear cache entries.
        
        Args:
            cache_type: If provided, clear only this cache type. Otherwise clear all.
        """
        if cache_type:
            # Remove all keys for this cache type
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(f"{cache_type}:")]
            for key in keys_to_remove:
                del self._cache[key]
        else:
            # Clear all cache
            self._cache.clear()
    
    def is_stale(self, cache_type: str, lat: float, lon: float, extra: Optional[str] = None) -> bool:
        """
        Check if cached data exists but is stale (expired).
        
        Args:
            cache_type: Type of cache
            lat: Latitude
            lon: Longitude
            extra: Optional extra parameter
            
        Returns:
            True if stale, False otherwise
        """
        key = self._generate_cache_key(cache_type, lat, lon, extra)
        
        if key not in self._cache:
            return False
        
        cached_item = self._cache[key]
        cached_time = cached_item.get("cached_at")
        
        if not cached_time:
            return True
        
        ttl_seconds = self._ttls.get(cache_type, 600)
        expiry_time = cached_time + timedelta(seconds=ttl_seconds)
        
        return datetime.now() > expiry_time


# Global cache instance
weather_cache = WeatherCache()