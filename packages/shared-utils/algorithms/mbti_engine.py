# Konvo Phase-1 Personality & MBTI Engine
# Deterministic scoring mapping 50 assessment questions to MBTI and Konvo DNA.

QUESTIONS = [
    # 1. Introversion / Extroversion & Social Energy (1-10)
    {"id": 1, "text": "I feel recharged after spending time with large groups of people.", "category": "social_energy", "dimension": "E", "multiplier": 1},
    {"id": 2, "text": "I prefer deep one-on-one conversations over lively group chats.", "category": "introversion", "dimension": "I", "multiplier": 1},
    {"id": 3, "text": "I tend to express my opinions immediately in meetings.", "category": "social_energy", "dimension": "E", "multiplier": 1},
    {"id": 4, "text": "I need solitary time to process my feelings and thoughts.", "category": "introversion", "dimension": "I", "multiplier": 1},
    {"id": 5, "text": "I enjoy being the center of attention in social gatherings.", "category": "extroversion", "dimension": "E", "multiplier": 1},
    {"id": 6, "text": "I find networking events draining rather than exciting.", "category": "introversion", "dimension": "I", "multiplier": 1},
    {"id": 7, "text": "I usually initiate contact with new friends.", "category": "extroversion", "dimension": "E", "multiplier": 1},
    {"id": 8, "text": "I keep my inner thoughts private from all but a few close connections.", "category": "introversion", "dimension": "I", "multiplier": 1},
    {"id": 9, "text": "I thrive in high-stimulation social settings.", "category": "extroversion", "dimension": "E", "multiplier": 1},
    {"id": 10, "text": "I prefer quiet evenings reading or coding over a crowded party.", "category": "social_energy", "dimension": "I", "multiplier": 1},

    # 2. Communication & Humor (11-18)
    {"id": 11, "text": "I communicate directly and literally, avoiding subtext.", "category": "communication", "dimension": "T", "multiplier": 1},
    {"id": 12, "text": "I prioritize harmony and avoiding hurt feelings in arguments.", "category": "communication", "dimension": "F", "multiplier": 1},
    {"id": 13, "text": "My humor relies heavily on wordplay, sarcasm, and irony.", "category": "humor", "dimension": "N", "multiplier": 1},
    {"id": 14, "text": "I prefer structured explanations with clear supporting data.", "category": "communication", "dimension": "T", "multiplier": 1},
    {"id": 15, "text": "I express empathy quickly when others are sharing challenges.", "category": "communication", "dimension": "F", "multiplier": 1},
    {"id": 16, "text": "I find funny situations in everyday anomalies and conceptual jokes.", "category": "humor", "dimension": "N", "multiplier": 1},
    {"id": 17, "text": "I tend to write long, detailed messages to explain my ideas.", "category": "communication", "dimension": "N", "multiplier": 1},
    {"id": 18, "text": "I appreciate slapstick or straightforward situational comedy.", "category": "humor", "dimension": "S", "multiplier": 1},

    # 3. Decision Making & Trust (19-26)
    {"id": 19, "text": "I base major life decisions on objective logic rather than gut feelings.", "category": "decision_making", "dimension": "T", "multiplier": 1},
    {"id": 20, "text": "I trust my intuition when analyzing a person's motives.", "category": "trust", "dimension": "N", "multiplier": 1},
    {"id": 21, "text": "I require verifiable facts before trusting a new claim.", "category": "trust", "dimension": "T", "multiplier": 1},
    {"id": 22, "text": "I choose paths that align with my emotional values, even if logically sub-optimal.", "category": "decision_making", "dimension": "F", "multiplier": 1},
    {"id": 23, "text": "I assume positive intent in people until proven otherwise.", "category": "trust", "dimension": "F", "multiplier": 1},
    {"id": 24, "text": "I analyze systems and components thoroughly before offering suggestions.", "category": "decision_making", "dimension": "T", "multiplier": 1},
    {"id": 25, "text": "I notice inconsistencies in statements quickly and point them out.", "category": "trust", "dimension": "T", "multiplier": 1},
    {"id": 26, "text": "I believe that group values are more important than cold equations.", "category": "decision_making", "dimension": "F", "multiplier": 1},

    # 4. Lifestyle & Ambition (27-34)
    {"id": 27, "text": "I maintain a highly structured schedule and checklist.", "category": "lifestyle", "dimension": "J", "multiplier": 1},
    {"id": 28, "text": "I work in quick bursts of spontaneous energy rather than organized steps.", "category": "lifestyle", "dimension": "P", "multiplier": 1},
    {"id": 29, "text": "My long-term ambition is focused on building stable systems and security.", "category": "ambition", "dimension": "J", "multiplier": 1},
    {"id": 30, "text": "I enjoy exploring multiple unrelated ideas without needing a final product.", "category": "ambition", "dimension": "P", "multiplier": 1},
    {"id": 31, "text": "I keep my desk and code index extremely tidy.", "category": "lifestyle", "dimension": "J", "multiplier": 1},
    {"id": 32, "text": "I find last-minute changes to plans exciting rather than stressful.", "category": "lifestyle", "dimension": "P", "multiplier": 1},
    {"id": 33, "text": "I value efficiency and optimization in my everyday routines.", "category": "lifestyle", "dimension": "J", "multiplier": 1},
    {"id": 34, "text": "I am motivated by creative freedom and conceptual breakthroughs.", "category": "ambition", "dimension": "N", "multiplier": 1},

    # 5. Conflict Style & Relationships (35-42)
    {"id": 35, "text": "I address conflicts directly and immediately to clear the air.", "category": "conflict_style", "dimension": "E", "multiplier": 1},
    {"id": 36, "text": "I withdraw during heated arguments to process them calmly.", "category": "conflict_style", "dimension": "I", "multiplier": 1},
    {"id": 37, "text": "I see debate as a collaborative tool to uncover facts, not a personal threat.", "category": "conflict_style", "dimension": "T", "multiplier": 1},
    {"id": 38, "text": "I seek deep, intense emotional vulnerability in long-term relationships.", "category": "relationships", "dimension": "F", "multiplier": 1},
    {"id": 39, "text": "I prefer partners who share my precise intellectual and technical interests.", "category": "relationships", "dimension": "N", "multiplier": 1},
    {"id": 40, "text": "I value practical support and shared domestic routines in a partner.", "category": "relationships", "dimension": "S", "multiplier": 1},
    {"id": 41, "text": "I find emotional outbursts from others uncomfortable and difficult to manage.", "category": "conflict_style", "dimension": "T", "multiplier": 1},
    {"id": 42, "text": "I prioritize relational growth and learning over simple comfort.", "category": "relationships", "dimension": "N", "multiplier": 1},

    # 6. Emotional Expression & Trust Ledger (43-50)
    {"id": 43, "text": "I easily share my emotional struggles and vulnerabilities with friends.", "category": "emotional_expression", "dimension": "F", "multiplier": 1},
    {"id": 44, "text": "I mask my emotions behind objective logic or humor.", "category": "emotional_expression", "dimension": "T", "multiplier": 1},
    {"id": 45, "text": "I need explicit reassurance that my connections are secure.", "category": "trust", "dimension": "F", "multiplier": 1},
    {"id": 46, "text": "I express affection through practical help or writing code/building systems.", "category": "emotional_expression", "dimension": "T", "multiplier": 1},
    {"id": 47, "text": "I notice subtle shifts in people's moods and act immediately to help.", "category": "emotional_expression", "dimension": "F", "multiplier": 1},
    {"id": 48, "text": "I believe trust must be earned through consistent action over time.", "category": "trust", "dimension": "J", "multiplier": 1},
    {"id": 49, "text": "I express my feelings through artistic or physical channels.", "category": "emotional_expression", "dimension": "S", "multiplier": 1},
    {"id": 50, "text": "I am comfortable letting people go if our values align no longer.", "category": "trust", "dimension": "T", "multiplier": 1}
]

MBTI_PROFILES = {
    "INTJ": {
        "summary": "The Strategist. Highly analytical, logical, and strategic. Values objective truth and system efficiency.",
        "growth": ["Incorporate emotional context in debates.", "Allow plans to develop organically.", "Practice sharing vulnerabilities directly."],
        "comm": "Structured, precise, and objective. Prefers conceptual topics.",
        "rel": "Seeks shared growth, intellectual depth, and absolute trust.",
        "friend": "Prefers a small circle of logical, supportive thinkers.",
        "type": "The Strategist"
    },
    "INFP": {
        "summary": "The Dreamer. Idealistic, empathic, and guided by deep personal values. Seeks authenticity.",
        "growth": ["Practice using objective facts in debates.", "Set structured routines to build consistency.", "Speak opinions immediately in groups."],
        "comm": "Vulnerable, creative, and values-driven. Explores possibilities.",
        "rel": "Seeks profound emotional intimacy and shared romantic ideals.",
        "friend": "Prefers deeply empathetic, open-minded friends.",
        "type": "The Dreamer"
    },
    "ENTP": {
        "summary": "The Challenger. Highly curious, quick-witted, and loves debating ideas. Explores new frameworks.",
        "growth": ["Notice when debate is causing personal friction.", "Build consistency and follow through on ideas.", "Allow silent processing time for others."],
        "comm": "Spontaneous, sarcastic, and dialectic. Challenges assumptions.",
        "rel": "Seeks intellectual sparring, novelty, and creative freedom.",
        "friend": "Enjoys eccentric, talkative, and intellectually curious peers.",
        "type": "The Challenger"
    },
    "INFJ": {
        "summary": "The Mystic. Intuitive, empathetic, and organized. Guided by systemic insights and empathy.",
        "growth": ["Avoid reading hidden agendas in simple actions.", "Express opinions immediately without self-editing.", "Accept casual, low-stakes interactions."],
        "comm": "Diplomatic, warm, and highly structured.",
        "rel": "Seeks soulful connections, deep trust, and shared long-term values.",
        "friend": "Values loyal, authentic, and emotionally deep friends.",
        "type": "The Companion"
    },
    "ISTJ": {
        "summary": "The Builder. Practical, orderly, and highly responsible. Relies on facts, logs, and consistency.",
        "growth": ["Practice conceptual lateral thinking.", "Be open to spontaneous, unplanned schedules.", "Express verbal appreciation of emotional needs."],
        "comm": "Literal, detailed, and data-dense. Focuses on execution.",
        "rel": "Values reliability, shared domestic routines, and steady loyalty.",
        "friend": "Prefers loyal, practical, and highly consistent friends.",
        "type": "The Builder"
    },
    "ENFP": {
        "summary": "The Explorer. Enthusiastic, creative, and highly social. Inspired by human possibilities and dreams.",
        "growth": ["Implement structured time logs to build plans.", "Practice detailed logical comparisons.", "Handle conflicts directly without avoiding."],
        "comm": "Inspirational, emotional, and highly expressive.",
        "rel": "Seeks spontaneous romance, emotional depth, and absolute freedom.",
        "friend": "Surrounds themselves with diverse, creative, and expressive nodes.",
        "type": "The Explorer"
    }
}

# Fallback profile for other combinations
DEFAULT_PROFILE = {
    "summary": "The Companion. Balanced thinker who adapts to the communication needs of the network.",
    "growth": ["Structure goals systematically.", "Balance logical facts with emotional support.", "Participate in social group settings."],
    "comm": "Diplomatic, clear, and adaptable.",
    "rel": "Values loyalty, shared trust, and clear communication.",
    "friend": "Forms close bonds based on mutual values.",
    "type": "The Companion"
}

def calculate_mbti(answers: dict) -> dict:
    # answers: dict mapping question_id (int or str) -> score (1 to 5)
    # 3 is neutral.
    # Scores: 1=-2, 2=-1, 3=0, 4=+1, 5=+2
    
    dimensions = {"E": 0, "I": 0, "S": 0, "N": 0, "T": 0, "F": 0, "J": 0, "P": 0}
    category_sums = {
        "social_energy": 0, "introversion": 0, "extroversion": 0,
        "communication": 0, "humor": 0, "decision_making": 0,
        "trust": 0, "lifestyle": 0, "ambition": 0,
        "conflict_style": 0, "relationships": 0, "emotional_expression": 0
    }
    category_counts = category_sums.copy()

    for q in QUESTIONS:
        qid = str(q["id"])
        score = answers.get(qid, answers.get(q["id"], 3)) # default neutral 3
        # Normalize score around 0
        norm = score - 3 # -2, -1, 0, 1, 2
        
        dim = q["dimension"]
        dimensions[dim] += norm * q["multiplier"]
        
        cat = q["category"]
        category_sums[cat] += score
        category_counts[cat] += 1

    # Determine letters
    mbti = ""
    mbti += "E" if dimensions["E"] >= dimensions["I"] else "I"
    mbti += "N" if dimensions["N"] >= dimensions["S"] else "S"
    mbti += "T" if dimensions["T"] >= dimensions["F"] else "F"
    mbti += "J" if dimensions["J"] >= dimensions["P"] else "P"

    # Calculate Confidence Score (average polarization of MBTI decisions)
    # Polarization = abs(val1 - val2) / scale
    tot_polarization = (
        abs(dimensions["E"] - dimensions["I"]) +
        abs(dimensions["N"] - dimensions["S"]) +
        abs(dimensions["T"] - dimensions["F"]) +
        abs(dimensions["J"] - dimensions["P"])
    )
    # Max possible polarization is roughly 50. Scale to percentage.
    confidence = min(100.0, 50.0 + (tot_polarization * 1.5))
    
    # Calculate DNA Indexes (scaled 0-100)
    def scale_cat(cat, reverse=False):
        raw = category_sums[cat] / max(1, category_counts[cat]) # 1.0 to 5.0
        val = (raw - 1.0) / 4.0 * 100.0 # 0 to 100
        if reverse:
            return 100.0 - val
        return val

    dna = {
        "dna_behavior": scale_cat("lifestyle"),
        "dna_personality": confidence,
        "dna_communication": scale_cat("communication"),
        "dna_relationship": scale_cat("relationships"),
        "dna_emotional": scale_cat("emotional_expression"),
        "dna_lifestyle": scale_cat("lifestyle"),
        "dna_interest": scale_cat("ambition"),
        "dna_trust": scale_cat("trust"),
        "dna_values": scale_cat("decision_making")
    }

    # Retrieve profile details
    profile = MBTI_PROFILES.get(mbti, DEFAULT_PROFILE)
    
    return {
        "mbti_type": mbti,
        "mbti_confidence": round(confidence, 1),
        "mbti_summary": profile["summary"],
        "mbti_growth_areas": profile["growth"],
        "mbti_communication_style": profile["comm"],
        "mbti_relationship_style": profile["rel"],
        "mbti_friendship_style": profile["friend"],
        "role_type": profile["type"],
        "dna": dna
    }
