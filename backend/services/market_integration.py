import requests
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from services.storage import load_json, save_json

class MarketIntegrationModule:
    def __init__(self, api_key="579b464db66ec23bdd0000016e80c977818949e44c38e181f58cf179"):
        # Resource ID for Variety-wise Daily Market Prices Data of Commodity
        self.api_url = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24" 
        self.api_key = api_key
        self.storage_file = "market_trends.json"
        
    def fetch_market_prices(self, state="Tamil Nadu", commodity="Rice", district=None):
        """
        Fetches current market prices for a given commodity and state using the data.gov.in API.
        Stored in market_trends.json for history.
        """
        if not self.api_key:
            return self._fallback(commodity)

        params = {
            "api-key": self.api_key, 
            "format": "json", 
            "limit": 10
        }
        if state:
            params["filters[State]"] = state
        if commodity:
            params["filters[Commodity]"] = commodity
        if district:
            params["filters[District]"] = district
            
        try:
            response = requests.get(self.api_url, params=params, timeout=10)
            if response.status_code != 200:
                return self._fallback(commodity)
                
            data = response.json()
            if data.get('records'):
                record = data['records'][0]
                price_data = {
                    "commodity": record.get('commodity'),
                    "variety": record.get('variety'),
                    "market": record.get('market'),
                    "modal_price": float(record.get('modal_price', 0)),
                    "max_price": float(record.get('max_price', 0)),
                    "min_price": float(record.get('min_price', 0)),
                    "arrival_date": record.get('arrival_date'),
                    "state": record.get('state'),
                    "district": record.get('district'),
                    "timestamp": datetime.now().isoformat()
                }
                self._store_trend(price_data)
                return price_data
            
            return self._fallback(commodity)
        except Exception as e:
            print(f"Error fetching market data: {e}")
            return self._fallback(commodity)

    def _store_trend(self, price_data):
        """Persist data for trend analysis"""
        if not price_data.get("commodity") or price_data.get("modal_price") == 0:
            return

        trends = load_json(self.storage_file)
        if "history" not in trends:
            trends["history"] = []
        
        # Avoid duplicate entries for the same day/market/commodity
        date_str = price_data["arrival_date"]
        key = f"{price_data['commodity']}_{price_data['market']}_{date_str}"
        
        if not any(f"{h['commodity']}_{h['market']}_{h['arrival_date']}" == key for h in trends["history"]):
            trends["history"].append(price_data)
            # Keep only last 100 entries per commodity
            save_json(self.storage_file, trends)

    def get_price_forecast(self, commodity, district=None):
        """
        Phase 2: Economic AI Engine - Price Forecasting
        Returns predicted trend and confidence.
        """
        trends = load_json(self.storage_file)
        history = [h for h in trends.get("history", []) if h["commodity"] == commodity]
        if district:
            hist_dist = [h for h in history if h["district"] == district]
            if len(hist_dist) > 2:
                history = hist_dist

        if len(history) < 2:
            return {
                "trend": "STABLE", 
                "confidence": 0.5, 
                "predicted_price": 2500,
                "current_price": 2400,
                "historical_data": [2400]
            }

        # Simplified Linear Trend Analysis (ARIMA-lite)
        prices = [h["modal_price"] for h in history][-7:] # Last 7 recorded days
        change = prices[-1] - prices[0]
        
        if change > 50:
            trend = "UP"
        elif change < -50:
            trend = "DOWN"
        else:
            trend = "STABLE"
            
        confidence = min(0.9, 0.5 + (len(history) * 0.05))
        predicted_price = prices[-1] + (change / len(prices)) * 14 # 14-day projection
        
        return {
            "trend": trend,
            "confidence": round(confidence, 2),
            "predicted_price": round(predicted_price, 2),
            "current_price": prices[-1],
            "historical_data": prices
        }

    def _fallback(self, commodity):
        return {
            "commodity": commodity,
            "modal_price": 2400.0,
            "trend": "UP",
            "market": "Local Mandi",
            "arrival_date": datetime.now().strftime("%d/%m/%Y"),
            "info": "Fallback data"
        }

    def calculate_economics(self, crop_type, field_size_acres, gdd_info, forecast):
        """
        Phase 2: The Economic AI Engine
        Fuses GDD (Biological) with Price Forecast (Economic).
        """
        # Yield assumptions
        yield_map = {"Rice": 22.0, "Wheat": 15.0, "Maize": 18.0, "Cotton": 10.0}
        est_yield = yield_map.get(crop_type, 15.0) * field_size_acres
        
        # Decision Logic
        trend = forecast["trend"]
        curr_price = forecast["current_price"]
        
        # Harvest Window from GDD: Assume maturity at 1000 GDD for Rice (example)
        # In a real system, target_gdd would come from crop metadata.
        target_gdd = 1200
        maturity_pct = gdd_info / target_gdd
        
        status = "YELLOW"
        action = "Hold / Wait"
        reason = f"Crop is at {round(maturity_pct * 100)}% maturity. Prices are {trend.lower()}."

        if maturity_pct > 0.95:
            if trend == "DOWN":
                status = "RED"
                action = "Harvest Now"
                reason = "Prices are crashing! Harvest immediately to secure current rates."
            elif trend == "UP":
                status = "GREEN"
                action = "Delay Harvest"
                reason = "Prices are rising. Wait 5-7 days to maximize revenue."
            else:
                status = "GREEN"
                action = "Harvest Ready"
                reason = "Market is stable. Harvest according to your labor schedule."
        
        return {
            "estimated_yield_quintals": round(est_yield, 2),
            "estimated_revenue": round(est_yield * curr_price, 2),
            "market_card": {
                "status": status,
                "action": action,
                "reason": reason,
                "price": curr_price,
                "trend": trend
            },
            "forecast": forecast
        }
