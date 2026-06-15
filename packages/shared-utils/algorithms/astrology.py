from datetime import date, time

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

ZODIAC_DATES = [
    ((3, 21), (4, 19), "Aries"),
    ((4, 20), (5, 20), "Taurus"),
    ((5, 21), (6, 20), "Gemini"),
    ((6, 21), (7, 22), "Cancer"),
    ((7, 23), (8, 22), "Leo"),
    ((8, 23), (9, 22), "Virgo"),
    ((9, 23), (10, 22), "Libra"),
    ((10, 23), (11, 21), "Scorpio"),
    ((11, 22), (12, 21), "Sagittarius"),
    ((12, 22), (1, 19), "Capricorn"),
    ((1, 20), (2, 18), "Aquarius"),
    ((2, 19), (3, 20), "Pisces")
]

# Characteristics for Sun, Moon, Ascendant
SUN_INSIGHTS = {
    "Aries": "Driven by action, initiating ideas with rapid execution speed, but sometimes impatient with detail.",
    "Taurus": "Values stability, working consistently, and bringing pragmatic execution to intellectual plans.",
    "Gemini": "Highly curious, thrives on multitasking, seeks diverse intellectual links, but risks surface-level focus.",
    "Cancer": "Emotionally intelligent, intuitive collaborator, protects community cohesion, but can be risk-averse.",
    "Leo": "Inspires others, projects high creative visibility, leads with confidence, but needs direct recognition.",
    "Virgo": "Highly analytical, detail-oriented, constructive editor, filters noise to produce fact-dense reasoning.",
    "Libra": "A natural debate mediator, seeks balanced structures and fair collaboration, but can be indecisive.",
    "Scorpio": "Profound, inquisitive, seeks deep leverage and root causes, but can be combative or secretive.",
    "Sagittarius": "Philosophical, highly exploratory, values broad concepts, but may overlook localized constraints.",
    "Capricorn": "Highly disciplined, structured builder, focuses on long-term reputation and structural consistency.",
    "Aquarius": "Innovative, objective, values systemic changes and human networks, but can appear detached.",
    "Pisces": "Empathic, highly intuitive, sees holistic patterns and creative connections, but lacks rigid structure."
}

MOON_INSIGHTS = {
    "Aries": "Emotional energy is rapid and reactive; expresses feelings immediately and constructively vents pressure.",
    "Taurus": "Seeks emotional security in material stability and predictable operational routines.",
    "Gemini": "Processes emotions through discussion and intellectualizing feelings; needs active talk to feel calm.",
    "Cancer": "Deeply receptive, feeling shifts in community tone instantly; seeks protective, nurturing spaces.",
    "Leo": "Needs creative validation and appreciation; emotional health is linked to feeling heard and seen.",
    "Virgo": "Finds comfort in organization, details, and solving problems; processes stress by editing systems.",
    "Libra": "Needs relational harmony; reacts to conflict by attempting immediate balance and mediation.",
    "Scorpio": "Highly private emotional space; experiences intense feelings and maintains absolute discretion.",
    "Sagittarius": "Finds emotional comfort in freedom, exploration, and philosophical optimism; dislikes confinement.",
    "Capricorn": "Reserved emotional expression; channels feelings into structured tasks and strategic projects.",
    "Aquarius": "Processes feelings with objective detachment; looks at emotions as systems to understand.",
    "Pisces": "Highly absorbent of external emotional sentiment; needs quiet spaces to filter ambient noise."
}

ASCENDANT_INSIGHTS = {
    "Aries": "Presents as active, direct, and initiating; ready to jump into discussions and debates.",
    "Taurus": "Presents as calm, steady, and deliberate; approaches new interactions with grounded patience.",
    "Gemini": "Presents as communicative, highly expressive, and mentally agile; rapid conversational pacing.",
    "Cancer": "Presents as gentle, careful, and protective; assesses trust levels before revealing opinions.",
    "Leo": "Presents with warmth, leadership, and high presence; naturally commands attention in discussion groups.",
    "Virgo": "Presents as helpful, orderly, and observant; listens carefully and offers structured, analytical feedback.",
    "Libra": "Presents as highly diplomatic, polished, and social; seeks immediate consensus and collaboration.",
    "Scorpio": "Presents with quiet intensity, observation, and deep presence; probes others while staying guarded.",
    "Sagittarius": "Presents as enthusiastic, candid, and broad-minded; shares ideas and visions openly.",
    "Capricorn": "Presents as professional, serious, and structured; respects hierarchies and established protocols.",
    "Aquarius": "Presents as individualistic, intellectual, and friendly; interested in global networks and systemic facts.",
    "Pisces": "Presents as sensitive, imaginative, and holistic; listens receptively and flows with conversation trends."
}

def get_sun_sign(birth_date: date) -> str:
    month = birth_date.month
    day = birth_date.day
    for start, end, sign in ZODIAC_DATES:
        start_month, start_day = start
        end_month, end_day = end
        if (month == start_month and day >= start_day) or (month == end_month and day <= end_day):
            return sign
    return "Aries"

def get_moon_sign(birth_date: date) -> str:
    # Estimate moon sign based on average lunar cycle epoch.
    # Standard approximation epoch: Jan 1, 1970 (new moon occurred on Jan 7, 1970).
    # Average lunar cycle is 27.3 days (sidereal month for zodiac positions).
    epoch = date(1970, 1, 1)
    delta = birth_date - epoch
    days = delta.days
    
    # Position in cycle (27.32158 days)
    position = (days % 27.32158) / 27.32158
    sign_index = int(position * 12)
    return ZODIAC_SIGNS[sign_index % 12]

def get_ascendant(birth_date: date, birth_time: time) -> str:
    # Traditional approximation of Ascendant sign based on birth time relative to Sunrise.
    # The Ascendant changes roughly every 2 hours, starting with the Sun Sign at sunrise.
    # We approximate Sunrise at 6:00 AM local time.
    sun_sign = get_sun_sign(birth_date)
    sun_index = ZODIAC_SIGNS.index(sun_sign)
    
    # Calculate hours since sunrise (6:00 AM)
    birth_hour_decimal = birth_time.hour + birth_time.minute / 60.0
    hours_since_sunrise = (birth_hour_decimal - 6.0) % 24.0
    
    # Each sign is 2 hours of rotation (30 degrees)
    sign_rotation = int(hours_since_sunrise / 2.0)
    asc_index = (sun_index + sign_rotation) % 12
    return ZODIAC_SIGNS[asc_index]

def calculate_astrology(birth_date: date, birth_time: time, location: str) -> dict:
    sun = get_sun_sign(birth_date)
    moon = get_moon_sign(birth_date)
    asc = get_ascendant(birth_date, birth_time)
    
    # Generate insights
    personality_insight = f"Sun in {sun}: {SUN_INSIGHTS[sun]}"
    communication_tendency = f"Ascendant in {asc} (Sunrise rotation alignment): {ASCENDANT_INSIGHTS[asc]}"
    emotional_dna = f"Moon in {moon}: {MOON_INSIGHTS[moon]}"
    
    # Life pattern report
    life_pattern_report = (
        f"Your elemental focus is driven by the interaction of Sun ({sun}), Moon ({moon}), and Ascendant ({asc}). "
        f"This combination suggests an orientation that balances the active intentions of {sun} with "
        f"the emotional processing style of {moon}. The external presentation is guided by {asc}, indicating "
        f"how you establish rapport and present data inside the Human Intelligence Network."
    )
    
    return {
        "sun_sign": sun,
        "moon_sign": moon,
        "ascendant": asc,
        "location": location,
        "personality_insights": personality_insight,
        "communication_tendencies": communication_tendency,
        "emotional_dna": emotional_dna,
        "life_pattern_report": life_pattern_report,
        "disclaimer": "ASTROLOGICAL ANALYSIS: Calculated using celestial geometric approximations. "
                      "This analysis is symbolic and is kept isolated from empirical behavioral metrics."
    }
