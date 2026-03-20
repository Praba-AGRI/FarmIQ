def format_dashboard_json(
    irr_prob, irrigation_needed, curr_etc, curr_sm, irr_amount_mm,
    nut_pred, predicted_stage, crop_name, field_size_acres,
    disease_risk, temp, humidity,
    spray_decision, wind_speed,
    market_data=None
):
    """
    Phase 5: The "Dumb Frontend" Mapper
    Translates raw ML + Math parameters into rigorous dictionary structure
    for immediate 0ms JSON delivery, bypassing LLM.
    """
    cards = []

    # 1. Irrigation Mapper (Rounded)
    curr_sm = round(curr_sm, 1)
    curr_etc = round(curr_etc, 1)
    irr_amount_mm = round(irr_amount_mm, 1)
    pump_minutes = max(45, int(round(irr_amount_mm * 6))) if irrigation_needed else 0
    
    if irrigation_needed:
        irr_status = "do_now"
        irr_action = f"Irrigate today. Apply {irr_amount_mm}mm of water."
        irr_reason = f"High atmospheric water demand (ETc: {curr_etc}mm) and dropping soil moisture ({curr_sm}%)."
    else:
        irr_status = "green"
        irr_action = "No irrigation needed today."
        irr_reason = f"Soil moisture is optimal at {curr_sm}% and atmospheric demand is low."
        
    cards.append({
        "title": "Irrigation",
        "status": irr_status,
        "description": irr_action,
        "explanation": irr_reason,
        "timing": "Today" if irrigation_needed else "Next 24h",
        "ml_data": {"amount_mm": irr_amount_mm, "pump_minutes": pump_minutes, "confidence": round(irr_prob * 100, 1)}
    })

    # 2. Nutrient Mapper (Full NPK + Rounded)
    n_req = round(float(nut_pred[0]), 1)
    p_req = round(float(nut_pred[1]), 1)
    k_req = round(float(nut_pred[2]), 1)
    
    if predicted_stage.lower() in ["flowering", "vegetative"]:
        nut_status = "wait"
        nut_action = f"Apply NPK split: {n_req}kg N, {p_req}kg P, {k_req}kg K."
        nut_reason = f"The crop has entered the {predicted_stage} stage and requires immediate nutrient loading to maximize yield."
    else:
        nut_status = "green"
        nut_action = "No fertilizer required at this stage."
        nut_reason = f"The crop currently has sufficient nutrients for its biological age. (N:{n_req} P:{p_req} K:{k_req})"

    cards.append({
        "title": "Nutrients",
        "status": nut_status,
        "description": nut_action,
        "explanation": nut_reason,
        "timing": "Next 2-3 days",
        "ml_data": {"nitro_kg": n_req, "p": p_req, "k": k_req, "confidence": 85}
    })

    # 3. Pest Management Mapper (Strict Healthy Check)
    temp = round(temp, 1)
    humidity = round(humidity, 1)
    if disease_risk in ["Healthy", "Normal", "Healthy_Low_Risk"]:
        pest_status = "green"
        pest_action = "No treatment needed today."
        pest_reason = f"Current temperatures ({temp}°C) are outside the breeding zones for local pathogens."
    else:
        pest_status = "do_now"
        pest_action = "Apply pesticide treatment immediately."
        pest_reason = f"Micro-climate conditions strongly favor an outbreak of {disease_risk}. Action required."

    cards.append({
        "title": "Pest Management",
        "status": pest_status,
        "description": pest_action,
        "explanation": pest_reason,
        "timing": "Monitor daily",
        "ml_data": {"risk_level": disease_risk, "confidence": 92}
    })

    # 4. Spraying Mapper (Green for Safe)
    wind_speed = round(wind_speed, 1)
    is_safe = "Safe" in spray_decision or "perfect" in spray_decision.lower()
    if is_safe:
        spray_status = "green"
        spray_action = "Perfect conditions for spraying."
        spray_reason = f"Wind speeds are calm at {wind_speed} km/h. Safe to apply agrochemicals."
    else:
        spray_status = "do_now"
        spray_action = "Do not spray today. High drift risk."
        spray_reason = f"High wind speeds ({wind_speed} km/h) risk chemical drift and waste money."

    cards.append({
        "title": "Spraying Conditions",
        "status": spray_status,
        "description": spray_action,
        "explanation": spray_reason,
        "timing": "Check before application",
        "ml_data": {"wind_speed": wind_speed}
    })

    overall_summary = f"{crop_name.capitalize()} is currently in {predicted_stage} stage."
    if any(c["status"] == "do_now" for c in cards):
        overall_summary += " Immediate actions are required below."
    else:
        overall_summary += " Farm parameters are optimal."

    return {
        "overall_summary": overall_summary,
        "cards": cards
    }
