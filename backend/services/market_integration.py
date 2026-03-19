import requests

class MarketIntegrationModule:
    def __init__(self, api_key="579b464db66ec23bdd0000016e80c977818949e44c38e181f58cf179"):
        # Resource ID for Variety-wise Daily Market Prices Data of Commodity
        self.api_url = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24" 
        self.api_key = api_key
        
    def fetch_market_prices(self, state="Tamil Nadu", commodity="Rice"):
        """
        Fetches current market prices for a given commodity and state using the data.gov.in API.
        """
        if self.api_key:
            params = {
                "api-key": self.api_key, 
                "format": "json", 
                "limit": 10
            }
            if state:
                params["filters[State]"] = state
            if commodity:
                params["filters[Commodity]"] = commodity
                
            try:
                response = requests.get(self.api_url, params=params, timeout=10)
                if response.status_code != 200:
                    print(f"API Error: Status Code {response.status_code}")
                    print(f"Response: {response.text[:200]}")
                    return self._fallback(commodity)
                    
                data = response.json()
                
                if data.get('records'):
                    record = data['records'][0]
                    return {
                        "commodity": record.get('commodity'),
                        "variety": record.get('variety'),
                        "market": record.get('market'),
                        "modal_price": float(record.get('modal_price', 0)),
                        "max_price": float(record.get('max_price', 0)),
                        "min_price": float(record.get('min_price', 0)),
                        "arrival_date": record.get('arrival_date'),
                        "state": record.get('state'),
                        "district": record.get('district'),
                        "trend": "stable" 
                    }
                return self._fallback(commodity)
            except Exception as e:
                print(f"Error fetching market data: {e}")
                return self._fallback(commodity)
                
        return self._fallback(commodity)
                
    def _fallback(self, commodity):
        return {
            "commodity": commodity,
            "modal_price": 2500.0,
            "trend": "up",
            "info": "Fallback/Mock data used"
        }

    def calculate_economics(self, crop_type, field_size_acres, time_for_harvest_days, market_price_per_quintal):
        """
        Integrate economic rules into the final advisory output based on 
        FIELD SIZE, TIME FOR HARVEST, and CROP TYPE.
        """
        # Yield assumptions (Quintals per acre)
        estimated_yield_per_acre_map = {
            "Rice": 22.0,
            "Wheat": 15.0,
            "Maize": 18.0,
            "Cotton": 10.0
        }
        estimated_yield_per_acre = estimated_yield_per_acre_map.get(crop_type, 15.0)
        
        expected_total_yield = estimated_yield_per_acre * field_size_acres
        estimated_gross_revenue = expected_total_yield * market_price_per_quintal
        
        if time_for_harvest_days > 15:
            market_advice = "Hold to sell (crop still maturing)"
        else:
            if market_price_per_quintal > 2400:
                market_advice = "Sell immediately (favorable market conditions)"
            else:
                market_advice = "Wait for price improvement if storage is available"
                
        return {
            "estimated_yield_quintals": round(expected_total_yield, 2),
            "estimated_revenue": round(estimated_gross_revenue, 2),
            "time_to_harvest_days": time_for_harvest_days,
            "market_advice": market_advice
        }
