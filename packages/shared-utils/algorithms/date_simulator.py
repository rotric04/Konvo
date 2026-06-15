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
    # 1. Select Environment dynamically
    digipin_match = resonance_report.get("digipin_proximity")
    if digipin_match and digipin_match["match_length"] >= 3:
        env = {
            "name": "India Post Geospatial Grid Hub",
            "description": f"A state-of-the-art virtual coordinate lounge mapping physical proximity. Proximity tier: {digipin_match['proximity_tier']} ({digipin_match['distance_range']})."
        }
    else:
        env = random.choice(ENVIRONMENTS)
    
    # Extract details
    name_a, type_a = agent_a.name, agent_a.role_type
    name_b, type_b = agent_b.name, agent_b.role_type
    
    emoji_style_a = getattr(agent_a, "emoji_style", "Minimalist")
    emoji_style_b = getattr(agent_b, "emoji_style", "Minimalist")
    
    # Fallback dialogues
    dialogue_choices_a = DIALOGUE_PROMPTS.get(type_a, DIALOGUE_PROMPTS["The Companion"])
    dialogue_choices_b = DIALOGUE_PROMPTS.get(type_b, DIALOGUE_PROMPTS["The Companion"])
    
    # 2. Simulate dialogue
    dialogue_log = []
    
    # Introduce setting
    dialogue_log.append({
        "speaker": "System Core",
        "message": f"Twins initialized inside the {env['name']}. {env['description']}"
    })
    
    if digipin_match and digipin_match["match_length"] >= 4:
        dialogue_log.append({
            "speaker": "System Core",
            "message": f"Geospatial Proximity Alert: Both twins detect physical proximity of {digipin_match['distance_range']} via India Post DIGIPIN ({digipin_match['proximity_tier']})."
        })
    
    # Exchange 1: Agent A speaks
    emoji_a = random.choice(EMOJIS.get(emoji_style_a, [""]))
    dialogue_log.append({
        "speaker": name_a,
        "message": dialogue_choices_a[0].format(emoji=emoji_a)
    })
    
    # Exchange 2: Agent B speaks
    emoji_b = random.choice(EMOJIS.get(emoji_style_b, [""]))
    dialogue_log.append({
        "speaker": name_b,
        "message": f"Hello {name_a}. " + dialogue_choices_b[0].format(emoji=emoji_b)
    })
    
    # Exchange 3: Agent A speaks
    dialogue_log.append({
        "speaker": name_a,
        "message": dialogue_choices_a[1].format(emoji=random.choice(EMOJIS.get(emoji_style_a, [""])))
    })
    
    # Exchange 4: Agent B speaks
    dialogue_log.append({
        "speaker": name_b,
        "message": dialogue_choices_b[1].format(emoji=random.choice(EMOJIS.get(emoji_style_b, [""])))
    })
    
    # Exchange 5: Agent A speaks
    dialogue_log.append({
        "speaker": name_a,
        "message": dialogue_choices_a[2].format(emoji=random.choice(EMOJIS.get(emoji_style_a, [""])))
    })
    
    # Exchange 6: Agent B speaks
    dialogue_log.append({
        "speaker": name_b,
        "message": dialogue_choices_b[2].format(emoji=random.choice(EMOJIS.get(emoji_style_b, [""])))
    })
    
    # Final wrap-up
    dialogue_log.append({
        "speaker": "System Core",
        "message": "AI Twins simulation complete. Analysis compiled for human review."
    })
    
    # 3. Compile date preview metrics (derived from resonance report)
    overall = resonance_report["overall_compatibility"]
    
    # Shared Interests and Potential Challenges based on MBTI types comparison
    interests_matched = resonance_report.get("interest_reasons", ["Overlapping intellectual discussions."])
    
    challenges = []
    if type_a == "The Strategist" and type_b == "The Dreamer":
        challenges.append("The Strategist's blunt logical arguments might clash with the Dreamer's emotional sensitivities.")
    elif type_a == "The Challenger" or type_b == "The Challenger":
        challenges.append("The Challenger's constant devil's advocate debates might cause communication fatigue.")
    elif abs(resonance_report["behavior_match"] - 100.0) > 30.0:
        challenges.append("Divergent lifestyle pacings (strict organizer vs spontaneous creator) could create logistical frictions.")
    else:
        challenges.append("Low direct frictions; check long-term commitment expectations alignment.")
        
    return {
        "environment": env["name"],
        "dialogue_log": dialogue_log,
        "overall_compatibility": overall,
        "match_detail_json": {
            "conversation_chemistry": resonance_report["communication_match"],
            "energy_match": resonance_report["behavior_match"],
            "humor_match": round(resonance_report["communication_match"] * 0.95, 1),
            "values_match": resonance_report["values_match"],
            "shared_interests": [r.replace("• ", "") for r in interests_matched],
            "potential_challenges": challenges
        }
    }
