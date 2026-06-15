# India Post DIGIPIN Geospatial Grid Algorithm
# Calculates geographic proximity tiers and score boosts based on DIGIPIN matching prefixes.

def calculate_digipin_proximity(pin1: str, pin2: str) -> dict:
    if not pin1 or not pin2:
        return {
            "match_length": 0,
            "proximity_tier": "Unknown",
            "distance_range": "Unknown",
            "score_boost": 0.0,
            "reason": "Missing location coordinates."
        }
    
    p1 = pin1.strip().upper()
    p2 = pin2.strip().upper()
    
    # Calculate matching prefix length
    match_len = 0
    for c1, c2 in zip(p1, p2):
        if c1 == c2:
            match_len += 1
        else:
            break
            
    # Map prefix match length to geospatial grids & distance ranges
    tiers = {
        0: {"tier": "Different Region", "range": "1000+ km", "boost": 0.0, "reason": "Divergent geographical zones."},
        1: {"tier": "Same Region", "range": "500-1000 km", "boost": 5.0, "reason": "Same national geographic division."},
        2: {"tier": "Same Sub-Region", "range": "150-500 km", "boost": 10.0, "reason": "Within adjacent state/territory circles."},
        3: {"tier": "Same District Circle", "range": "40-150 km", "boost": 18.0, "reason": "Same district postal administrative zone."},
        4: {"tier": "Same Sub-District", "range": "10-40 km", "boost": 25.0, "reason": "Local sub-district overlap."},
        5: {"tier": "Same Locality", "range": "2-10 km", "boost": 35.0, "reason": "Same postal delivery sorting sub-grid."},
        6: {"tier": "Same Neighborhood", "range": "500m - 2km", "boost": 42.0, "reason": "Extremely close neighborhood grids."},
        7: {"tier": "Immediate Proximity", "range": "100m - 500m", "boost": 48.0, "reason": "Adjacent blocks / walking distance."},
        8: {"tier": "Same Building/Complex", "range": "15m - 100m", "boost": 50.0, "reason": "Same apartment complex or office park."},
        9: {"tier": "Virtually Identical", "range": "4m - 15m", "boost": 50.0, "reason": "Same physical unit or adjacent door."},
        10: {"tier": "Same Spot", "range": "0m - 4m", "boost": 50.0, "reason": "Identical geospatial index grid spot."}
    }
    
    match_len = min(match_len, 10)
    info = tiers.get(match_len, tiers[0])
    
    return {
        "match_length": match_len,
        "proximity_tier": info["tier"],
        "distance_range": info["range"],
        "score_boost": info["boost"],
        "reason": info["reason"]
    }
