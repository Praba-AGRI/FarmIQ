from market_integration import MarketIntegrationModule
import json

def test_real_market_data():
    print("Initializing Market Integration Module with Sample API Key...")
    market = MarketIntegrationModule()
    
    print("Fetching real-time market prices (Unfiltered)...")
    result = market.fetch_market_prices(state=None, commodity=None)
    
    print("\n--- Market Data Results ---")
    print(json.dumps(result, indent=4))
    
    if "info" in result and result["info"] == "Fallback/Mock data used":
        print("\nWARNING: API call failed or returned no records. Verify Internet connection/API Key.")
    else:
        print("\nSUCCESS: Real-time data fetched from data.gov.in!")

    # Test Economic Calculation
    print("\nTesting Economic Calculation for 2.5 acres of Rice...")
    economics = market.calculate_economics(
        crop_type="Rice",
        field_size_acres=2.5,
        time_for_harvest_days=10,
        market_price_per_quintal=result["modal_price"]
    )
    print(json.dumps(economics, indent=4))

if __name__ == "__main__":
    test_real_market_data()
