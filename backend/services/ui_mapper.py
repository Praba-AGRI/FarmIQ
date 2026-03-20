def format_dashboard_json(
    irr_prob, irrigation_needed, curr_etc, curr_sm, irr_amount_mm,
    nut_pred, predicted_stage, crop_name, field_size_acres,
    disease_risk, temp, humidity,
    spray_decision, wind_speed
):
    """
    Phase 5: The "Dumb Frontend" Mapper
    Translates raw ML + Math parameters into rigorous dictionary structure
    for immediate 0ms JSON delivery, bypassing LLM.
    """
    cards = []

    # 1. Irrigation Mapper
    pump_minutes = max(45, int(round(irr_amount_mm * 6))) if irrigation_needed else 0
    if irrigation_needed:
        irr_status = "do_now"
        irr_action = f"Irrigate for {pump_minutes} mins today."
        irr_reason = f"High ETc demand ({curr_etc:.1f}mm) and low soil moisture ({curr_sm:.1f}%). Probability: {irr_prob*100:.1f}%"
    else:
        irr_status = "green"
        irr_action = "No irrigation needed."
        irr_reason = f"Soil moisture is adequate ({curr_sm:.1f}%) and current crop demand is low."
        
    cards.append({
        "title": "Irrigation",
        "status": irr_status,
        "description": irr_action,
        "explanation": irr_reason,
        "timing": "Today" if irrigation_needed else "Next 24h",
        "ml_data": {"amount_mm": irr_amount_mm, "pump_minutes": pump_minutes, "confidence": round(irr_prob * 100, 1)}
    })

    # 2. Nutrient Mapper
    # Nitrogen recommendation from RF array 0
    nitro_kg = round(float(nut_pred[0]), 1)
    phos_kg = round(float(nut_pred[1]), 1)
    potas_kg = round(float(nut_pred[2]), 1)
    
    if nitro_kg > 50 or phos_kg > 30:
        nut_status = "wait"
        nut_action = f"Apply NPK split: {nitro_kg}kg N, {phos_kg}kg P."
        nut_reason = f"The {crop_name} is in the {predicted_stage} stage requiring high nutrient loading."
    else:
        nut_status = "green"
        nut_action = f"Maintain normal soil health (N:{nitro_kg} P:{phos_kg} K:{potas_kg})."
        nut_reason = f"Current {predicted_stage} stage does not indicate severe stress."

    cards.append({
        "title": "Nutrients",
        "status": nut_status,
        "description": nut_action,
        "explanation": nut_reason,
        "timing": "Next 2-3 days",
        "ml_data": {"nitro_kg": nitro_kg, "p": phos_kg, "k": potas_kg, "confidence": 85}
    })

    # 3. Pest Management Mapper
    if disease_risk == "Healthy" or disease_risk == "Normal":
        pest_status = "green"
        pest_action = "No pathogen detected."
        pest_reason = f"Current temp ({temp:.1f}°C) and humidity ({humidity:.1f}%) are not favorable for pests."
    else:
        pest_status = "do_now"
        pest_action = f"Treatment required for {disease_risk} risk."
        pest_reason = f"Environmental conditions are highly favorable for {disease_risk}."

    cards.append({
        "title": "Pest Management",
        "status": pest_status,
        "description": pest_action,
        "explanation": pest_reason,
        "timing": "Monitor daily",
        "ml_data": {"risk_level": disease_risk, "confidence": 92}
    })

    # 4. Spraying Mapper
    is_safe = "Safe" in spray_decision or "perfect" in spray_decision.lower()
    if is_safe:
        spray_status = "monitor"
        spray_action = "Perfect conditions for spraying."
        spray_reason = f"Wind speeds ({wind_speed:.1f} km/h) and humidity are optimal."
    else:
        spray_status = "do_now"
        spray_action = "Do not spray today."
        spray_reason = f"High wind speeds ({wind_speed:.1f} km/h) risk chemical drift."

    cards.append({
        "title": "Spraying Conditions",
        "status": spray_status,
        "description": spray_action,
        "explanation": spray_reason,
        "timing": "Check before application",
        "ml_data": {"wind_speed": wind_speed}
    })
    
    overall_summary = f"{crop_name} is currently in {predicted_stage} stage."
    if any(c["status"] == "do_now" for c in cards):
        overall_summary += " Immediate actions are required below."
    else:
        overall_summary += " Farm parameters are optimal."

    return {
        "overall_summary": overall_summary,
        "cards": cards
    }
