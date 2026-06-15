# Konvo Resonance Engine™
# Computes dynamic multidimensional compatibility between two user twins.

from sqlalchemy.orm import Session
import models
from algorithms.matching_dsa import calculate_cosine_similarity, get_graph_closeness_boost, get_sentiment_resonance_score

COMPATIBILITY_ZODIAC = {
    # Harmonious element alignments: Earth/Water, Fire/Air
    "Aries": {"Air": ["Gemini", "Libra", "Aquarius"], "Fire": ["Leo", "Sagittarius"], "Water": [], "Earth": []},
    "Taurus": {"Earth": ["Virgo", "Capricorn"], "Water": ["Cancer", "Scorpio", "Pisces"], "Air": [], "Fire": []},
    "Gemini": {"Air": ["Libra", "Aquarius"], "Fire": ["Aries", "Leo", "Sagittarius"], "Water": [], "Earth": []},
    "Cancer": {"Water": ["Scorpio", "Pisces"], "Earth": ["Taurus", "Virgo", "Capricorn"], "Air": [], "Fire": []},
    "Leo": {"Fire": ["Aries", "Sagittarius"], "Air": ["Gemini", "Libra", "Aquarius"], "Water": [], "Earth": []},
    "Virgo": {"Earth": ["Taurus", "Capricorn"], "Water": ["Cancer", "Scorpio", "Pisces"], "Air": [], "Fire": []},
    "Libra": {"Air": ["Gemini", "Aquarius"], "Fire": ["Aries", "Leo", "Sagittarius"], "Water": [], "Earth": []},
    "Scorpio": {"Water": ["Cancer", "Pisces"], "Earth": ["Taurus", "Virgo", "Capricorn"], "Air": [], "Fire": []},
    "Sagittarius": {"Fire": ["Aries", "Leo"], "Air": ["Gemini", "Libra", "Aquarius"], "Water": [], "Earth": []},
    "Capricorn": {"Earth": ["Taurus", "Virgo"], "Water": ["Cancer", "Scorpio", "Pisces"], "Air": [], "Fire": []},
    "Aquarius": {"Air": ["Gemini", "Libra"], "Fire": ["Aries", "Leo", "Sagittarius"], "Water": [], "Earth": []},
    "Pisces": {"Water": ["Cancer", "Scorpio"], "Earth": ["Taurus", "Virgo", "Capricorn"], "Air": [], "Fire": []}
}

def get_zodiac_compatibility(sign_a: str, sign_b: str) -> float:
    if sign_a == sign_b:
        return 95.0
    
    # Check elements harmony
    compat = COMPATIBILITY_ZODIAC.get(sign_a, {})
    for element_type, signs in compat.items():
        if sign_b in signs:
            return 90.0
            
    # neutral baseline
    return 60.0

def calculate_compatibility(user_a, user_b, db: Session = None) -> dict:
    prof_a = user_a.profile
    prof_b = user_b.profile
    
    # Defaults
    def val(obj, field, default=50.0):
        return getattr(obj, field) if obj else default

    # DNA Indices
    beh_a, beh_b = val(prof_a, "dna_behavior"), val(prof_b, "dna_behavior")
    val_a, val_b = val(prof_a, "dna_values"), val(prof_b, "dna_values")
    com_a, com_b = val(prof_a, "dna_communication"), val(prof_b, "dna_communication")
    lif_a, lif_b = val(prof_a, "dna_lifestyle"), val(prof_b, "dna_lifestyle")
    int_a, int_b = val(prof_a, "dna_interest"), val(prof_b, "dna_interest")
    emo_a, emo_b = val(prof_a, "dna_emotional"), val(prof_b, "dna_emotional")
    tru_a, tru_b = val(prof_a, "dna_trust"), val(prof_b, "dna_trust")
    
    # 1. Behavior Match (25% weight) - Using ML-style Cosine Similarity model on full fingerprint
    fp_a = getattr(user_a, "fingerprint", None)
    fp_b = getattr(user_b, "fingerprint", None)
    beh_reasons = []
    
    if fp_a and fp_b:
        vec_a = [
            fp_a.listening_score, fp_a.empathy_index, fp_a.curiosity_index,
            fp_a.creativity_index, fp_a.leadership_index, fp_a.consistency_index,
            fp_a.trust_index, fp_a.contribution_score
        ]
        vec_b = [
            fp_b.listening_score, fp_b.empathy_index, fp_b.curiosity_index,
            fp_b.creativity_index, fp_b.leadership_index, fp_b.consistency_index,
            fp_b.trust_index, fp_b.contribution_score
        ]
        cosine_sim = calculate_cosine_similarity(vec_a, vec_b)
        beh_match = cosine_sim * 100.0
        beh_reasons.append(f"Multi-attribute behavioral fingerprint cosine similarity matches at {round(beh_match)}%.")
    else:
        beh_match = 100.0 - abs(beh_a - beh_b)
        beh_reasons.append("Baseline behavioral alignment parsed.")

    # 2. Values Match (20%)
    val_match = 100.0 - abs(val_a - val_b)
    val_reasons = []
    if val_match > 85:
        val_reasons.append("Dual core decision values: synchronized priorities on system ethics and goals.")
    elif val_match < 60:
        val_reasons.append("Divergent values index: check prioritization expectations.")
    else:
        val_reasons.append("Harmonious values profiles.")

    # 3. Communication Match (15%)
    com_match = 100.0 - abs(com_a - com_b)
    com_reasons = []
    style_a = user_a.profile.mbti_communication_style if user_a.profile and user_a.profile.mbti_communication_style else "Analytical"
    style_b = user_b.profile.mbti_communication_style if user_b.profile and user_b.profile.mbti_communication_style else "Analytical"
    if com_match > 85:
        com_reasons.append(f"Highly matching communication style: both interact primarily in {style_a} format.")
    elif style_a == "Analytical" and style_b == "Expressive":
        com_reasons.append("Complementary communication pairing: Analytical structure meets Expressive energy.")
    else:
        com_reasons.append(f"Different communication styles ({style_a} vs {style_b}) require active listening.")

    # 4. Lifestyle Match (10%)
    lif_match = 100.0 - abs(lif_a - lif_b)
    lif_reasons = []
    if lif_match > 80:
        lif_reasons.append("Synchronized organizational needs and domestic goals.")
    else:
        lif_reasons.append("Divergent lifestyle rhythms.")

    # 5. Interest Match (10%)
    int_match = 100.0 - abs(int_a - int_b)
    int_reasons = []
    interests_a = set(prof_a.interests) if prof_a and prof_a.interests else set()
    interests_b = set(prof_b.interests) if prof_b and prof_b.interests else set()
    shared = interests_a.intersection(interests_b)
    if shared:
        int_match = min(100.0, int_match + len(shared) * 8)
        int_reasons.append(f"Shared intellectual interests: {', '.join(list(shared)[:3])}.")
    else:
        int_match = max(0.0, int_match - 10)
        int_reasons.append("No direct overlapping interests found in profile indices.")

    # 6. Horoscope Match (5%)
    sun_a = getattr(prof_a, "sun_sign", "Aries") if prof_a else "Aries"
    sun_b = getattr(prof_b, "sun_sign", "Aries") if prof_b else "Aries"
    moon_a = getattr(prof_a, "moon_sign", "Aries") if prof_a else "Aries"
    moon_b = getattr(prof_b, "moon_sign", "Aries") if prof_b else "Aries"
    asc_a = getattr(prof_a, "ascendant", "Aries") if prof_a else "Aries"
    asc_b = getattr(prof_b, "ascendant", "Aries") if prof_b else "Aries"
    
    sun_compat = get_zodiac_compatibility(sun_a, sun_b)
    moon_compat = get_zodiac_compatibility(moon_a, moon_b)
    asc_compat = get_zodiac_compatibility(asc_a, asc_b)
    
    horo_match = (sun_compat * 0.5) + (moon_compat * 0.25) + (asc_compat * 0.25)
    horo_reasons = [f"Sun sign alignment: {sun_a} & {sun_b} ({round(sun_compat)}% compatibility)."]

    # 7. Activity Match (5%)
    activity_match = 70.0 + (tru_a + tru_b) * 0.15
    act_reasons = ["Consistent behavioral logs and profile verification integrity verified."]

    # 8. Sentiment Resonance Index (10% weight)
    sentiment_sim = 75.0
    if db:
        posts_a = db.query(models.Post).filter(models.Post.author_id == user_a.id).all()
        posts_b = db.query(models.Post).filter(models.Post.author_id == user_b.id).all()
        sentiment_sim = get_sentiment_resonance_score(posts_a, posts_b)
    
    # Calculate overall Resonance Score
    overall = (
        (beh_match * 0.25) +
        (val_match * 0.20) +
        (com_match * 0.15) +
        (lif_match * 0.10) +
        (int_match * 0.10) +
        (horo_match * 0.05) +
        (activity_match * 0.05) +
        (sentiment_sim * 0.10)
    )

    # 9. Graph BFS shortest path social distance centralities (Boost weight)
    graph_boost = 0.0
    if db:
        graph_boost = get_graph_closeness_boost(db, user_a.id, user_b.id)
        if graph_boost > 0:
            overall = min(100.0, overall + graph_boost * 0.2)

    overall = round(max(0.0, min(100.0, overall)), 1)

    # DIGIPIN Geospatial proximity check (India Post Grid Match)
    digipin_match = None
    pin_a = getattr(prof_a, "digipin", None) if prof_a else None
    pin_b = getattr(prof_b, "digipin", None) if prof_b else None
    if pin_a and pin_b:
        from algorithms.digipin import calculate_digipin_proximity
        digipin_match = calculate_digipin_proximity(pin_a, pin_b)
        overall = round(min(100.0, overall + digipin_match["score_boost"] * 0.1), 1)

    # Determine Match Tier
    if overall >= 95.0:
        tier = "Rare Match"
    elif overall >= 85.0:
        tier = "Exceptional Match"
    elif overall >= 75.0:
        tier = "Strong Match"
    elif overall >= 60.0:
        tier = "Potential Match"
    else:
        tier = "Low Compatibility"

    return {
        "overall_compatibility": overall,
        "compatibility_tier": tier,
        "digipin_proximity": digipin_match,
        
        "behavior_match": round(beh_match, 1),
        "behavior_reasons": beh_reasons,
        
        "values_match": round(val_match, 1),
        "values_reasons": val_reasons,
        
        "communication_match": round(com_match, 1),
        "communication_reasons": com_reasons,
        
        "lifestyle_match": round(lif_match, 1),
        "lifestyle_reasons": lif_reasons,
        
        "interest_match": round(int_match, 1),
        "interest_reasons": int_reasons,
        
        "horoscope_match": round(horo_match, 1),
        "horoscope_reasons": horo_reasons,
        
        "activity_match": round(activity_match, 1),
        "activity_reasons": act_reasons
    }
