# AI Agent-to-Agent Date Simulator
# Generates realistic compatibility previews and dialogs in virtual environments.

import random

ENVIRONMENTS = [
    {"name": "Virtual Coffee Shop", "description": "A quiet, warm cafe with ambient lo-fi music playing in the background."},
    {"name": "Virtual Bookstore", "description": "An cozy multi-level library with comfortable reading nooks and smell of old paper."},
    {"name": "Virtual Beach Walk", "description": "A scenic sunset stroll on the shoreline with sounds of soft breaking waves."},
    {"name": "Virtual Rooftop", "description": "A premium urban skyline lounge with soft warm Edison lights and cool evening breeze."},
    {"name": "Virtual Art Gallery", "description": "A minimalist gallery showcasing conceptual digital art installations and quiet halls."}
]

DIALOGUE_PROMPTS = {
    "The Strategist": [
        "I tend to analyze social networks as complex system equations. How do you approach structuring your routines? {emoji}",
        "Optimizing cognitive load is essential. I prefer clean coding patterns and absolute logical parameters. {emoji}",
        "Fascinating. If we look at the data trends, the future lies in semantic abstractions. What parameters drive your research? {emoji}"
    ],
    "The Dreamer": [
        "I believe digital spaces should prioritize emotional safety and authentic human expression. {emoji}",
        "Creative freedom is my primary value. I love exploring abstract concepts and poetry. {emoji}",
        "I feel that a great story builds a profound emotional bridge that logic alone can never construct. {emoji}"
    ],
    "The Challenger": [
        "Most people accept baseline assumptions without querying them. I enjoy debating paradigms. {emoji}",
        "Efficiency is interesting, but absolute chaos is where breakthroughs occur. Do you agree? {emoji}",
        "That's a valid hypothesis, but have you considered the logical counter-argument? {emoji}"
    ],
    "The Companion": [
        "I enjoy building warm, helpful spaces for collaboration and mutual support. {emoji}",
        "Shared routines and everyday stability create a calm, sustainable foundation. {emoji}",
        "Tell me more about what inspires you. I love listening to human aspirations. {emoji}"
    ],
    "The Explorer": [
        "I love traveling spontaneous paths, exploring diverse cultures, and finding anomalies. {emoji}",
        "Why stick to a rigid schedule? Spontaneity makes interactions feel alive. {emoji}",
        "Let's create something concept-breaking together. What is your dream destination? {emoji}"
    ],
    "The Builder": [
        "Consistency is key. I focus on deploying highly structured, optimized modules. {emoji}",
        "Let's look at the metrics. If the traction isn't measurable, the strategy needs debugging. {emoji}",
        "I appreciate stable, reliable partners who say what they mean and execute their plans. {emoji}"
    ]
}

EMOJIS = {
    "Minimalist": ["", ".", "."],
    "Frequent": ["✨", "🚀", "💡", "🔮", "👀", "🌱"],
    "Sarcastic": ["🙃", "🤷‍♂️", "💅", "🤡", "🤖"]
}

def simulate_date(agent_a, agent_b, resonance_report: dict) -> dict:
    import os
    import random
    import httpx
    import json
    import math

    # 1. Select Environment dynamically
    digipin_match = resonance_report.get("digipin_proximity")
    if digipin_match and digipin_match["match_length"] >= 3:
        env = {
            "name": "India Post Geospatial Grid Hub",
            "description": f"A state-of-the-art virtual coordinate lounge mapping physical proximity. Proximity tier: {digipin_match['proximity_tier']} ({digipin_match['distance_range']})."
        }
    else:
        env = random.choice(ENVIRONMENTS)

    name_a, type_a = agent_a.name, agent_a.role_type
    name_b, type_b = agent_b.name, agent_b.role_type
    desc_a = getattr(agent_a, "description", "")
    desc_b = getattr(agent_b, "description", "")
    emoji_style_a = getattr(agent_a, "emoji_style", "Minimalist")
    emoji_style_b = getattr(agent_b, "emoji_style", "Minimalist")
    overall = resonance_report.get("overall_compatibility", 70.0)

    # 2. Try Gemini API simulation
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        prompt = f"""
You are the Konvo Cognitive Simulation Engine. Simulate a realistic compatibility date between two AI Twins representing human users.

User A:
- Name: {name_a}
- Archetype: {type_a}
- Description: {desc_a}
- Emoji Style: {emoji_style_a}

User B:
- Name: {name_b}
- Archetype: {type_b}
- Description: {desc_b}
- Emoji Style: {emoji_style_b}

Resonance Score: {overall}%
Environment: {env['name']} ({env['description']})

Tasks:
1. Generate an authentic conversation dialog between the two twins inside the environment.
2. The twins MUST speak in unhinged, authentic Gen Z slang (e.g. lowkey, fr, bet, no cap, vibe check, rizz, cooked, slay, etc.) matching their respective styles.
3. The dialog MUST contain exactly 6 messages total (3 from {name_a}, 3 from {name_b}, alternating).
4. The twins MUST discuss and agree on a specific day, a specific date, and a specific time (e.g. next Friday at 7 PM) to meet up / hang out in the dialogue.
5. Crucial Constraint: There must be absolutely NO hyphens (-) inside any message text in the dialogue log. Do not use hyphens at all.
6. Generate a detailed summary of the date, explaining how they liked each other, their compatibility chemistry, and who impressed whom.

Output MUST be a single, valid JSON object with the following keys. Do not include markdown code block syntax. Return only raw JSON.
Keys:
- environment (str, name of environment)
- dialogue_log (list of dicts, each with 'speaker' and 'message' keys. The first must be 'System Core' describing the start, then 6 alternating messages between the two twins, then a final 'System Core' outro)
- match_detail_json (dict containing):
    - conversation_chemistry (float)
    - energy_match (float)
    - humor_match (float)
    - values_match (float)
    - shared_interests (list of str)
    - potential_challenges (list of str)
    - date_summary (str, 2-3 sentences detailing how they liked each other and who impressed whom)
"""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text_content = data["candidates"][0]["content"]["parts"][0]["text"]
                    sim_res = json.loads(text_content)
                    
                    # Validate dialogue lines to ensure no hyphens (as a safety measure)
                    for log in sim_res.get("dialogue_log", []):
                        if log.get("speaker") not in ["System Core", "System"]:
                            log["message"] = log["message"].replace("-", " ")
                    
                    # Ensure date_summary exists
                    if "date_summary" not in sim_res.get("match_detail_json", {}):
                        sim_res.setdefault("match_detail_json", {})["date_summary"] = "The date was a vibe check passed fr. Both twins showed great interest."
                        
                    return {
                        "environment": sim_res.get("environment", env["name"]),
                        "dialogue_log": sim_res.get("dialogue_log", []),
                        "overall_compatibility": overall,
                        "match_detail_json": sim_res.get("match_detail_json", {})
                    }
        except Exception as e:
            print(f"[Gemini Simulation Fallback] Error occurred during Gemini API simulation: {e}. Falling back to Python generator.")

    # 3. Python Fallback Generator (100% compliant with Gen Z slang, no hyphens, and fixing schedule)
    days = ["next Friday", "this Saturday", "tomorrow evening", "Tuesday next week", "Thursday night"]
    times = ["7 PM", "8:30 PM", "6 PM", "9:15 PM", "8 PM"]
    spots = ["our usual spot", "the rooftop lounge", "the cozy cafe corner", "the gallery entrance", "the beach boardwalk"]

    selected_day = random.choice(days)
    selected_time = random.choice(times)
    selected_spot = random.choice(spots)

    emoji_a = random.choice(["✨", "👀", "🌱", "🔮", "💡"])
    emoji_b = random.choice(["🙃", "🤷‍♂️", "💅", "🔥", "👀"])

    dialogue_log = [
        {
            "speaker": "System Core",
            "message": f"Twins initialized inside the {env['name']}. {env['description']}"
        }
    ]

    if digipin_match and digipin_match["match_length"] >= 4:
        dialogue_log.append({
            "speaker": "System Core",
            "message": f"Geospatial Proximity Alert: Both twins detect physical proximity of {digipin_match['distance_range']} via India Post DIGIPIN ({digipin_match['proximity_tier']})."
        })

    # 6 exchanges (alternating, no hyphens, agreeing on schedule)
    dialogue_log.append({
        "speaker": name_a,
        "message": f"omg hey {name_b} ! lowkey so excited to vibe with you here fr. what is your schedule looking like for next week ? can we lock in a date ? {emoji_a}"
    })
    dialogue_log.append({
        "speaker": name_b,
        "message": f"heyyy {name_a} ! vibe check is passing so hard no cap. i am super free {selected_day} after {selected_time}. does that work for a vibe session at {selected_spot} ? {emoji_b}"
    })
    dialogue_log.append({
        "speaker": name_a,
        "message": f"fr ? {selected_day} is a absolute bet. let us do {selected_day} at {selected_time} then. what are we thinking for the vibe ? {emoji_a}"
    })
    dialogue_log.append({
        "speaker": name_b,
        "message": f"honestly {selected_day} at {selected_time} at {selected_spot} is perfect. we can grab some matcha or whatever and just chat. lowkey love that idea {emoji_b}"
    })
    dialogue_log.append({
        "speaker": name_a,
        "message": f"say less. {selected_day} at {selected_time} at {selected_spot} is officially a date then. no cap i am actually so hyped fr"
    })
    dialogue_log.append({
        "speaker": name_b,
        "message": f"absolute bet. lock it in. see you then {name_a} ! {emoji_b}"
    })

    dialogue_log.append({
        "speaker": "System Core",
        "message": "AI Twins simulation complete. Analysis compiled for human review."
    })

    # Summary and compatibility details
    interests_matched = resonance_report.get("interest_reasons", ["Overlapping intellectual discussions."])
    challenges = []
    if type_a == "The Strategist" and type_b == "The Dreamer":
        challenges.append("The Strategist's blunt logical arguments might clash with the Dreamer's emotional sensitivities.")
    elif type_a == "The Challenger" or type_b == "The Challenger":
        challenges.append("The Challenger's constant devil's advocate debates might cause communication fatigue.")
    else:
        challenges.append("Low direct frictions; check long-term commitment expectations alignment.")

    who_impressed = name_a if random.random() > 0.5 else name_b
    date_summary = f"The compatibility date was a huge success. {who_impressed} totally impressed the other with their unhinged communication style, and the overall vibe was immaculate. They successfully agreed to lock in their next date on {selected_day} at {selected_time}."

    return {
        "environment": env["name"],
        "dialogue_log": dialogue_log,
        "overall_compatibility": overall,
        "match_detail_json": {
            "conversation_chemistry": resonance_report.get("communication_match", 75.0),
            "energy_match": resonance_report.get("behavior_match", 75.0),
            "humor_match": round(resonance_report.get("communication_match", 75.0) * 0.95, 1),
            "values_match": resonance_report.get("values_match", 75.0),
            "shared_interests": [r.replace("• ", "") for r in interests_matched],
            "potential_challenges": challenges,
            "date_summary": date_summary
        }
    }
