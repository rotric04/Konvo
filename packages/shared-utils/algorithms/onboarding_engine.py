# Konvo Cognitive Onboarding 4.0 & Cognitive Calibration Engine
import os
import json
import httpx
import random
import datetime
from sqlalchemy.orm import Session
import models
import crud
from vector_store import vector_store

# Target distributions for 8 questions calibration flow:
# Step 0: scenario (Scenario Based)
# Step 1: scenario (Scenario Based)
# Step 2: tradeoff (Tradeoff Based)
# Step 3: open_ended (Open Ended)
# Step 4: social (Social Behavior)
# Step 5: scenario (Scenario Based)
# Step 6: tradeoff (Tradeoff Based)
# Step 7: lifestyle (Lifestyle)
TYPES_SEQUENCE = [
    "scenario",
    "scenario",
    "tradeoff",
    "open_ended",
    "social",
    "scenario",
    "tradeoff",
    "lifestyle"
]

FALLBACK_QUESTIONS = {
    "scenario": [
        {
            "question": "It's Friday night and your plans suddenly get cancelled.",
            "options": [
                {"key": "A", "text": "Nice, unexpected free time."},
                {"key": "B", "text": "Let's make new plans."},
                {"key": "C", "text": "Depends who cancelled."},
                {"key": "D", "text": "That ruined my mood."}
            ],
            "transition_message": "Interesting."
        },
        {
            "question": "Someone leaves you on seen for 3 days.",
            "options": [
                {"key": "A", "text": "I move on."},
                {"key": "B", "text": "I double text."},
                {"key": "C", "text": "Depends who it is."},
                {"key": "D", "text": "I assume something happened."}
            ],
            "transition_message": "I think I'm getting your vibe."
        },
        {
            "question": "You enter a networking event and spill a drink on yourself.",
            "options": [
                {"key": "A", "text": "Laugh it off and point it out."},
                {"key": "B", "text": "Quietly head to the restroom to clean it."},
                {"key": "C", "text": "Hope nobody noticed and keep talking."},
                {"key": "D", "text": "Leave the event early."}
            ],
            "transition_message": "Let's try another."
        }
    ],
    "tradeoff": [
        {
            "question": "Choose the trait you value most in a close connection.",
            "options": [
                {"key": "A", "text": "Humor"},
                {"key": "B", "text": "Intelligence"},
                {"key": "C", "text": "Ambition"},
                {"key": "D", "text": "Emotional Maturity"}
            ],
            "transition_message": "One more thing."
        },
        {
            "question": "If you could only have one in your daily life, what would it be?",
            "options": [
                {"key": "A", "text": "Predictable structure"},
                {"key": "B", "text": "Spontaneous freedom"},
                {"key": "C", "text": "Intellectual debate"},
                {"key": "D", "text": "Deep emotional safety"}
            ],
            "transition_message": "Interesting tradeoff."
        }
    ],
    "open_ended": [
        {
            "question": "What's something people usually misunderstand about you?",
            "options": [],
            "transition_message": "You're surprisingly difficult to predict."
        },
        {
            "question": "Describe your ideal connection in one sentence.",
            "options": [],
            "transition_message": "Let's explore your deep connections."
        }
    ],
    "social": [
        {
            "question": "You enter a room full of strangers.",
            "options": [
                {"key": "A", "text": "Start conversations."},
                {"key": "B", "text": "Join conversations."},
                {"key": "C", "text": "Observe first."},
                {"key": "D", "text": "Find one person."}
            ],
            "transition_message": "Let's look at social behavior."
        }
    ],
    "lifestyle": [
        {
            "question": "How do you typically spend your free Sunday afternoon?",
            "options": [
                {"key": "A", "text": "Exploring a new place outdoors."},
                {"key": "B", "text": "Binge-watching a show or gaming."},
                {"key": "C", "text": "Reading, writing, or coding alone."},
                {"key": "D", "text": "Catching up with a close friend over coffee."}
            ],
            "transition_message": "Just a lifestyle check."
        }
    ]
}

def generate_next_question(demographics: dict, history: list) -> dict:
    step = len(history)
    if step >= len(TYPES_SEQUENCE):
        return {"complete": True}
        
    next_type = TYPES_SEQUENCE[step]
    api_key = os.getenv("GEMINI_API_KEY")
    
    if api_key:
        # Prompt Gemini to generate a question dynamically
        gender = demographics.get("gender", "Unknown")
        age = demographics.get("age", 22)
        digipin = demographics.get("digipin", "None")
        language = demographics.get("language", "English")
        
        history_summary = []
        for h in history:
            history_summary.append(f"Q: {h.get('question_text')} | Answer: {h.get('answer_text')}")
        history_str = "\n".join(history_summary) if history_summary else "No previous questions."

        # Adapt scenarios based on gender
        adaptation_rule = "Adapt to their demographics without stereotyping. "
        if gender.lower() == "male":
            adaptation_rule += "Provide scenarios that gently test initiative, accountability, and social action."
        elif gender.lower() == "female":
            adaptation_rule += "Provide scenarios that focus on trust, communication, boundaries, and emotional safety."
        else:
            adaptation_rule += "Provide scenarios that focus on community, identity validation, and social networks."

        prompt = f"""
You are the Konvo Cognitive Calibration Engine. Generate a single onboarding calibration question of type '{next_type}' tailored for a user with these demographics:
Gender: {gender}
Age: {age}
DIGIPIN/Region: {digipin}
Language: {language}

Adaptation context:
{adaptation_rule}

User calibration history so far:
{history_str}

UX Transitions:
Before sending this question, output a short, context-appropriate, conversational transitions state to display (e.g., 'Interesting.', 'I think I'm getting your vibe.', 'One more thing.', 'Let's try another.', 'You're surprisingly difficult to predict.').

Return only a valid JSON object. Do not include markdown code block syntax or outer ```json blocks.
JSON Schema keys:
- question: (string) The text of the question.
- options: (list of objects with keys 'key' and 'text') Standard choices (A, B, C, D) with their options text. For 'open_ended' type, options must be empty/null.
- transition_message: (string) The conversational feedback or intro transition message (e.g. 'Interesting.', 'Let's try another.').
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=8.0)
            if response.status_code == 200:
                res_data = response.json()
                text_resp = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text_resp.startswith("```json"):
                    text_resp = text_resp[7:]
                if text_resp.endswith("```"):
                    text_resp = text_resp[:-3]
                res_json = json.loads(text_resp.strip())
                
                # Verify keys
                if "question" in res_json:
                    return {
                        "complete": False,
                        "type": next_type,
                        "question": res_json["question"],
                        "options": res_json.get("options") or [],
                        "transition_message": res_json.get("transition_message") or "I think I'm getting your vibe."
                    }
        except Exception as e:
            print(f"[Calibration Engine] Gemini question generation failed, falling back: {e}")

    # Fallback to local static pool
    pool = FALLBACK_QUESTIONS.get(next_type, FALLBACK_QUESTIONS["scenario"])
    # Determine index based on count of this type already in history
    asked_count = sum(1 for h in history if h.get("question_type") == next_type)
    idx = asked_count % len(pool)
    q_data = pool[idx]
    
    return {
        "complete": False,
        "type": next_type,
        "question": q_data["question"],
        "options": q_data["options"],
        "transition_message": q_data["transition_message"]
    }

def analyze_calibration(db: Session, user_id: int, demographics: dict, history: list) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    user = crud.get_user_by_id(db, user_id)
    if not user:
        return {}
        
    history_summary = []
    for h in history:
        history_summary.append(
            f"Type: {h.get('question_type')} | Q: {h.get('question_text')} | Answer: {h.get('answer_text')} | Latency: {h.get('latency_ms')}ms"
        )
    history_str = "\n".join(history_summary)
    
    gender = demographics.get("gender", "Unknown")
    age = demographics.get("age", 22)
    digipin = demographics.get("digipin", "None")
    language = demographics.get("language", "English")

    res_json = None
    if api_key:
        prompt = f"""
You are the Konvo Cognitive Calibration Pipeline. Analyze this user's dynamic onboarding calibration inputs (including choices, writing style, response latency, demographics) to calculate their MBTI, Big Five personality snapshot, and 8-domain text profiles.

User Demographics:
Gender: {gender}
Age: {age}
DIGIPIN/Region: {digipin}
Language: {language}

Calibration History:
{history_str}

Tasks:
1. Predict their MBTI personality type (must be one of the standard 16 types).
2. Calculate a confidence level (percentage between 50 and 100).
3. Draft a premium, professional summary/snapshot of their archetype (e.g. 'The Strategist. Highly analytical...').
4. Determine their Role Type archetype (e.g., 'The Strategist', 'The Dreamer', 'The Challenger', 'The Companion', 'The Builder', 'The Explorer').
5. Provide a summary of their Big Five traits (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism).
6. Provide brief style summaries for: Communication, Humor, Social Energy, Emotional Style.
7. Generate lists for: discovery_tags (list of 5 tags), compatibility_markers (list of 4 markers), conversation_hooks (list of 3 items), and interest_clusters (list of 4 interest areas).
8. Calculate the 9 Konvo DNA indices (values from 0.0 to 100.0) based on their behavior, answers, and latencies:
   - dna_behavior (lifestyle consistency, routines vs spontaneity)
   - dna_personality (confidence, polarization of traits)
   - dna_communication (articulate, logical vs expressive, casual)
   - dna_relationship (desire for intimacy, depth, stability)
   - dna_emotional (vulnerability level, empathy)
   - dna_lifestyle (activity level, domestic priorities)
   - dna_interest (conceptual depth, technical vs arts)
   - dna_trust (open book vs guarded, verification readiness)
   - dna_values (objectivity, ethics, prioritization)
9. Provide detailed text descriptions (1-2 sentences) representing the user in 8 distinct domains. These will be converted into embedding vectors.
   - interest_profile
   - social_profile
   - humor_profile
   - communication_profile
   - curiosity_profile
   - compatibility_profile
   - emotional_profile
   - lifestyle_profile

Return only a valid JSON object. Do not wrap in markdown or outer ```json blocks.
JSON Schema keys:
- mbti_type: (string)
- mbti_confidence: (float)
- role_type: (string)
- personality_snapshot: (string)
- big_five_summary: (string)
- communication_style: (string)
- humor_style: (string)
- social_energy: (string)
- emotional_style: (string)
- discovery_tags: (list of strings)
- compatibility_markers: (list of strings)
- conversation_hooks: (list of strings)
- interest_clusters: (list of strings)
- dna_behavior: (float)
- dna_personality: (float)
- dna_communication: (float)
- dna_relationship: (float)
- dna_emotional: (float)
- dna_lifestyle: (float)
- dna_interest: (float)
- dna_trust: (float)
- dna_values: (float)
- interest_profile: (string)
- social_profile: (string)
- humor_profile: (string)
- communication_profile: (string)
- curiosity_profile: (string)
- compatibility_profile: (string)
- emotional_profile: (string)
- lifestyle_profile: (string)
"""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        try:
            response = httpx.post(url, headers=headers, json=payload, timeout=12.0)
            if response.status_code == 200:
                res_data = response.json()
                text_resp = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if text_resp.startswith("```json"):
                    text_resp = text_resp[7:]
                if text_resp.endswith("```"):
                    text_resp = text_resp[:-3]
                res_json = json.loads(text_resp.strip())
        except Exception as e:
            print(f"[Calibration Analysis] Gemini deep analysis failed, falling back: {e}")

    if not res_json:
        # Fallback heuristic calibration
        # Let's map the 8 questions to E/I, N/S, T/F, J/P based on fallback answer keys
        e_i, n_s, t_f, j_p = 0, 0, 0, 0
        latencies = []
        
        for h in history:
            q_type = h.get("question_type")
            ans = h.get("answer_text", "")
            latencies.append(h.get("latency_ms", 5000))
            
            if q_type == "scenario":
                if ans == "A": e_i -= 1; j_p += 1
                elif ans == "B": e_i += 1; j_p -= 1
                elif ans == "C": t_f += 1
                elif ans == "D": t_f -= 1; e_i -= 1
            elif q_type == "tradeoff":
                if ans == "A": e_i += 1; j_p -= 1
                elif ans == "B": n_s += 1; t_f += 1
                elif ans == "C": j_p += 1; t_f += 1
                elif ans == "D": t_f -= 1; j_p += 1
            elif q_type == "social":
                if ans == "A": e_i += 2
                elif ans == "B": e_i += 1
                elif ans == "C": e_i -= 2
                elif ans == "D": e_i -= 1
            elif q_type == "lifestyle":
                if ans == "A": n_s -= 1; e_i += 1
                elif ans == "B": e_i -= 1; j_p -= 1
                elif ans == "C": n_s += 1; e_i -= 1
                elif ans == "D": e_i += 1; t_f -= 1
                
        mbti_val = ""
        mbti_val += "E" if e_i >= 0 else "I"
        mbti_val += "N" if n_s >= 0 else "S"
        mbti_val += "T" if t_f >= 0 else "F"
        mbti_val += "J" if j_p >= 0 else "P"
        
        # Build fallback profile details
        mbti_details = {
            "INTJ": {"role": "The Strategist", "snapshot": "Deeply analytical, strategic, and values logical consistency."},
            "INFP": {"role": "The Dreamer", "snapshot": "Idealistic, values authenticity and deep emotional safety."},
            "ENTP": {"role": "The Challenger", "snapshot": "Curious, loves debate, and tests boundary lines."},
            "INFJ": {"role": "The Mystic", "snapshot": "Intuitive, organized, and focused on deep harmony."},
            "ISTJ": {"role": "The Builder", "snapshot": "Practical, detail-oriented, and highly consistent."},
            "ENFP": {"role": "The Explorer", "snapshot": "Spontaneous, social, and eager for conceptual breakthroughs."}
        }
        details = mbti_details.get(mbti_val, {"role": "The Companion", "snapshot": "Balanced, supportive social node."})
        
        res_json = {
            "mbti_type": mbti_val,
            "mbti_confidence": 75.0,
            "role_type": details["role"],
            "personality_snapshot": details["snapshot"],
            "big_five_summary": "Moderate Openness, High Conscientiousness, Moderate Social Energy.",
            "communication_style": "Clear, objective, and adaptive.",
            "humor_style": "Witty and situational.",
            "social_energy": "Recharges with small select groups.",
            "emotional_style": "Analytical, seeks validation.",
            "discovery_tags": ["philosophy", "curiosity", "technology", "culture", "discovery"],
            "compatibility_markers": ["INTJ", "INFP", "ENFP", "INFJ"],
            "conversation_hooks": ["Tell me about your favorite book.", "What is a project you are proud of?", "If you could visit any planet, where would it be?"],
            "interest_clusters": ["Conceptual Reading", "Tech Ideation", "Abstract Systems", "Lifestyle Exploration"],
            "dna_behavior": 60.0,
            "dna_personality": 75.0,
            "dna_communication": 65.0,
            "dna_relationship": 70.0,
            "dna_emotional": 55.0,
            "dna_lifestyle": 50.0,
            "dna_interest": 70.0,
            "dna_trust": 60.0,
            "dna_values": 65.0,
            "interest_profile": "Values conceptual depth and programming.",
            "social_profile": "Prefers select deep circles over crowds.",
            "humor_profile": "Enjoys dry humor, wordplay, and sarcasm.",
            "communication_profile": "Prefers logical, structured dialogue.",
            "curiosity_profile": "High index of interest in systems.",
            "compatibility_profile": "Seeks growth and intellectual depth.",
            "emotional_profile": "Thoughtful, holds high boundaries.",
            "lifestyle_profile": "Balances productive coding with relaxation."
        }

    # Now, save all generated outputs to profile, settings, vectors, etc.
    # 1. Update user profile fields (standard tables)
    if not user.profile:
        user.profile = models.UserProfile(user_id=user_id, display_name=user.email.split("@")[0])
        db.add(user.profile)
        db.flush()
        
    prof = user.profile
    prof.mbti_type = res_json["mbti_type"]
    prof.mbti_confidence = res_json["mbti_confidence"]
    prof.mbti_summary = res_json["personality_snapshot"]
    prof.mbti_growth_areas = ["Set clear milestones for personal growth.", "Practice proactive communication.", "Allow spontaneity in routines."]
    prof.mbti_communication_style = res_json["communication_style"]
    prof.mbti_relationship_style = "Values deep emotional safety and mutual growth."
    prof.mbti_friendship_style = "Seeks supportive, authentic connections."
    
    # User never manually creates profile attributes. Save DIGIPIN and Gender adaptations.
    prof.gender = gender
    prof.digipin = digipin
    
    # Save interests from interest_clusters
    prof.interests = res_json["interest_clusters"]
    
    # Populate DNA indices
    prof.dna_behavior = res_json["dna_behavior"]
    prof.dna_personality = res_json["dna_personality"]
    prof.dna_communication = res_json["dna_communication"]
    prof.dna_relationship = res_json["dna_relationship"]
    prof.dna_emotional = res_json["dna_emotional"]
    prof.dna_lifestyle = res_json["dna_lifestyle"]
    prof.dna_interest = res_json["dna_interest"]
    prof.dna_trust = res_json["dna_trust"]
    prof.dna_values = res_json["dna_values"]
    
    user.konvo_id = crud.generate_konvo_id(res_json["mbti_type"])

    # 2. Store all generated outputs in new PersonalityProfile table
    p_profile = db.query(models.PersonalityProfile).filter(models.PersonalityProfile.user_id == user_id).first()
    if not p_profile:
        p_profile = models.PersonalityProfile(user_id=user_id)
        db.add(p_profile)
        
    p_profile.snapshot = res_json["personality_snapshot"]
    p_profile.mbti_prediction = res_json["mbti_type"]
    p_profile.big_five_summary = res_json["big_five_summary"]
    p_profile.communication_style = res_json["communication_style"]
    p_profile.humor_style = res_json["humor_style"]
    p_profile.social_energy = res_json["social_energy"]
    p_profile.emotional_style = res_json["emotional_style"]
    p_profile.discovery_tags = res_json["discovery_tags"]
    p_profile.compatibility_markers = res_json["compatibility_markers"]
    p_profile.conversation_hooks = res_json["conversation_hooks"]
    p_profile.interest_clusters = res_json["interest_clusters"]
    p_profile.updated_at = datetime.datetime.utcnow()

    # 3. Store behavioral choices in behavioral_signals table
    scenario_choices = {}
    tradeoff_choices = {}
    open_responses = {}
    response_latencies = {}
    writing_style_metrics = {
        "total_latency_ms": 0,
        "avg_words_open_ended": 0,
        "questions_completed": len(history)
    }
    
    open_ended_word_count = 0
    open_ended_qty = 0
    
    for i, h in enumerate(history):
        q_type = h.get("question_type")
        ans = h.get("answer_text", "")
        lat = h.get("latency_ms", 0)
        q_text = h.get("question_text", "")
        
        response_latencies[f"q{i}"] = lat
        writing_style_metrics["total_latency_ms"] += lat
        
        if q_type == "scenario":
            scenario_choices[q_text] = ans
        elif q_type == "tradeoff":
            tradeoff_choices[q_text] = ans
        elif q_type == "open_ended":
            open_responses[q_text] = ans
            open_ended_word_count += len(ans.split())
            open_ended_qty += 1
        else:
            scenario_choices[q_text] = ans # social & lifestyle behave similarly
            
    if open_ended_qty > 0:
        writing_style_metrics["avg_words_open_ended"] = open_ended_word_count / open_ended_qty
        
    b_signal = models.BehavioralSignal(
        user_id=user_id,
        scenario_choices=scenario_choices,
        tradeoff_choices=tradeoff_choices,
        open_responses=open_responses,
        response_latencies=response_latencies,
        writing_style_metrics=writing_style_metrics
    )
    db.add(b_signal)

    # 4. Generate 128-dimensional unit vectors for the 8 domains
    interest_vec = vector_store._generate_embedding(res_json["interest_profile"])
    social_vec = vector_store._generate_embedding(res_json["social_profile"])
    humor_vec = vector_store._generate_embedding(res_json["humor_profile"])
    comm_vec = vector_store._generate_embedding(res_json["communication_profile"])
    curiosity_vec = vector_store._generate_embedding(res_json["curiosity_profile"])
    compat_vec = vector_store._generate_embedding(res_json["compatibility_profile"])
    emot_vec = vector_store._generate_embedding(res_json["emotional_profile"])
    life_vec = vector_store._generate_embedding(res_json["lifestyle_profile"])
    
    u_embedding = db.query(models.UserEmbedding).filter(models.UserEmbedding.user_id == user_id).first()
    if not u_embedding:
        u_embedding = models.UserEmbedding(user_id=user_id)
        db.add(u_embedding)
        
    u_embedding.interest_vector = interest_vec
    u_embedding.social_vector = social_vec
    u_embedding.humor_vector = humor_vec
    u_embedding.communication_vector = comm_vec
    u_embedding.curiosity_vector = curiosity_vec
    u_embedding.compatibility_vector = compat_vec
    u_embedding.emotional_vector = emot_vec
    u_embedding.lifestyle_vector = life_vec

    # 5. Populate helper relation tables
    # Clean old ones first
    db.query(models.InterestCluster).filter(models.InterestCluster.user_id == user_id).delete()
    db.query(models.CompatibilityVector).filter(models.CompatibilityVector.user_id == user_id).delete()
    db.query(models.SocialVector).filter(models.SocialVector.user_id == user_id).delete()
    
    for cluster in res_json["interest_clusters"]:
        db.add(models.InterestCluster(user_id=user_id, cluster_name=cluster, score=100.0))
        
    db.add(models.CompatibilityVector(user_id=user_id, vector_data=compat_vec))
    db.add(models.SocialVector(user_id=user_id, vector_data=social_vec))

    db.commit()

    # 6. Generate cognitive twin (Agent)
    crud.generate_user_twin(db, user_id, res_json["role_type"])
    
    return res_json
