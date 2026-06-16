from sqlalchemy.orm import Session
from datetime import datetime, date, time
import hashlib
import random
from typing import Optional, List
import os
import httpx
import json
import models
import schemas
from algorithms.mbti_engine import calculate_mbti
from algorithms.compatibility import calculate_compatibility
from algorithms.date_simulator import simulate_date
from algorithms.astrology import calculate_astrology
from algorithms.digipin import calculate_digipin_proximity
from redis_client import redis_client
from neo4j_client import neo4j_client
from clickhouse_client import clickhouse_client
from vector_store import vector_store
from argon2 import PasswordHasher

ph = PasswordHasher()

from resend_client import resend_client

import secrets

# ----------------- REGISTRATION & OTP -----------------
def generate_konvo_id(mbti: str) -> str:
    # Example: KON-INTJ-72A91
    rand = secrets.token_hex(3).upper()[:5]
    return f"KON-{mbti}-{rand}"

def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserRegister):
    hashed_password = ph.hash(user.password)
    otp = generate_otp()
    
    # Pre-calculate baseline MBTI and ID (defaults to INTJ, recalculated on assessment quiz)
    konvo_id = generate_konvo_id("INTJ")
    
    db_user = models.User(
        email=user.email, password_hash=hashed_password, konvo_id=konvo_id,
        phone=user.phone, otp_code=otp, otp_verified=False, otp_created_at=datetime.utcnow(),
        username=user.username
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Calculate baseline astrology Sun/Moon/Ascendant if birth data provided
    sun = moon = asc = "Aries"
    if user.birth_date and user.birth_location:
        b_time = user.birth_time or time(12, 0)
        astro = calculate_astrology(user.birth_date, b_time, user.birth_location)
        sun = astro["sun_sign"]
        moon = astro["moon_sign"]
        asc = astro["ascendant"]
        
    db_profile = models.UserProfile(
        user_id=db_user.id, display_name=user.display_name, gender=user.gender,
        looking_for_gender=user.looking_for_gender, bio="",
        relationship_intent=user.relationship_intent,
        birth_date=user.birth_date, birth_time=user.birth_time, birth_location=user.birth_location,
        digipin=user.digipin,
        sun_sign=sun, moon_sign=moon, ascendant=asc,
        interests=user.interests, goals=user.goals
    )
    db.add(db_profile)
    db.commit()

    # Create baseline fingerprint
    db_fingerprint = models.BehavioralFingerprint(
        user_id=db_user.id, communication_style="Analytical", debate_style="Constructive",
        listening_score=70.0, empathy_index=70.0, curiosity_index=70.0, creativity_index=70.0,
        leadership_index=70.0, consistency_index=70.0, trust_index=70.0, contribution_score=30.0
    )
    db.add(db_fingerprint)
    db.commit()
    
    # Dispatch OTP verification email via Resend
    resend_client.send_otp_email(user.email, otp, user.display_name)
    
    # Log OTP generated in server console/audit log for easy client access
    print(f"\n[OTP SYSTEM] Verification code generated for {user.email}: {otp}\n")
    clickhouse_client.log_event("UserRegistered", {"email": user.email, "konvo_id": konvo_id})
    
    return db_user

def create_verified_user(db: Session, user_data: dict) -> models.User:
    email = user_data["email"]
    password_hash = user_data["password_hash"]
    display_name = user_data["display_name"]
    username = user_data["username"]
    phone = user_data["phone"]
    gender = user_data.get("gender", "Unknown")
    looking_for_gender = user_data.get("looking_for_gender", "All")
    relationship_intent = user_data.get("relationship_intent", "Long Term")
    interests = user_data.get("interests", [])
    goals = user_data.get("goals", [])
    birth_date_str = user_data.get("birth_date")
    birth_time_str = user_data.get("birth_time")
    birth_location = user_data.get("birth_location")
    digipin = user_data.get("digipin")

    b_date = None
    if birth_date_str:
        b_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
    
    b_time = None
    if birth_time_str:
        b_time = datetime.strptime(birth_time_str, "%H:%M:%S").time()

    # Pre-calculate baseline MBTI and ID
    konvo_id = generate_konvo_id("INTJ")

    db_user = models.User(
        email=email, password_hash=password_hash, konvo_id=konvo_id,
        phone=phone, otp_code=None, otp_verified=True, otp_created_at=datetime.utcnow(),
        username=username
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Calculate baseline astrology Sun/Moon/Ascendant if birth data provided
    sun = moon = asc = "Aries"
    if b_date and birth_location:
        bt = b_time or time(12, 0)
        try:
            astro = calculate_astrology(b_date, bt, birth_location)
            sun = astro["sun_sign"]
            moon = astro["moon_sign"]
            asc = astro["ascendant"]
        except Exception as e:
            print(f"[ASTROLOGY ERROR] {e}")

    db_profile = models.UserProfile(
        user_id=db_user.id, display_name=display_name, gender=gender,
        looking_for_gender=looking_for_gender, bio="",
        relationship_intent=relationship_intent,
        birth_date=b_date, birth_time=b_time, birth_location=birth_location,
        digipin=digipin,
        sun_sign=sun, moon_sign=moon, ascendant=asc,
        interests=interests, goals=goals
    )
    db.add(db_profile)
    db.commit()

    # Create baseline fingerprint
    db_fingerprint = models.BehavioralFingerprint(
        user_id=db_user.id, communication_style="Analytical", debate_style="Constructive",
        listening_score=70.0, empathy_index=70.0, curiosity_index=70.0, creativity_index=70.0,
        leadership_index=70.0, consistency_index=70.0, trust_index=70.0, contribution_score=30.0
    )
    db.add(db_fingerprint)
    db.commit()

    # Send welcoming marketing email and user guide onboarding email via Resend
    try:
        resend_client.send_marketing_welcome_email(email, display_name)
        resend_client.send_user_guide_email(email, display_name)
    except Exception as e:
        print(f"[WELCOME EMAIL ERROR] {e}")

    clickhouse_client.log_event("UserRegistered", {"email": email, "konvo_id": konvo_id})
    clickhouse_client.log_event("UserOTPVerified", {"email": email})

    return db_user

def verify_user_otp(db: Session, email: str, otp_code: str) -> bool:
    user = get_user_by_email(db, email)
    if not user:
        return False
        
    # Check for OTP expiry (5 minutes)
    if user.otp_created_at and (datetime.utcnow() - user.otp_created_at).total_seconds() > 300:
        user.otp_code = None  # Invalidate expired OTP
        db.commit()
        return False
        
    # Check against database stored OTP code
    is_valid = (user.otp_code == otp_code)
        
    if is_valid:
        user.otp_verified = True
        db.commit()
        clickhouse_client.log_event("UserOTPVerified", {"email": email})
        
        # Send welcoming marketing email and user guide onboarding email via Resend
        display_name = user.profile.display_name if user.profile else "Valued Member"
        resend_client.send_marketing_welcome_email(email, display_name)
        resend_client.send_user_guide_email(email, display_name)
        return True
        
    return False

def update_user_profile(db: Session, user_id: int, profile_update: schemas.ProfileUpdateRequest) -> Optional[models.User]:
    user = get_user_by_id(db, user_id)
    if not user:
        return None

    # Calculate baseline astrology Sun/Moon/Ascendant if birth data provided
    sun = moon = asc = "Aries"
    b_date = profile_update.birth_date
    b_time = profile_update.birth_time
    b_location = profile_update.birth_location
    if b_date and b_location:
        bt = b_time or time(12, 0)
        try:
            astro = calculate_astrology(b_date, bt, b_location)
            sun = astro["sun_sign"]
            moon = astro["moon_sign"]
            asc = astro["ascendant"]
        except Exception as e:
            print(f"[ASTROLOGY RECALCULATION ERROR] {e}")

    # Update UserProfile fields
    if user.profile:
        user.profile.display_name = profile_update.display_name
        user.profile.bio = profile_update.bio
        user.profile.gender = profile_update.gender
        user.profile.looking_for_gender = profile_update.looking_for_gender
        user.profile.birth_date = b_date
        user.profile.birth_time = b_time
        user.profile.birth_location = b_location
        user.profile.digipin = profile_update.digipin
        user.profile.interests = profile_update.interests
        user.profile.goals = profile_update.goals
        user.profile.relationship_intent = profile_update.relationship_intent
        
        # Only override astrology signs if we calculated them successfully
        if b_date and b_location:
            user.profile.sun_sign = sun
            user.profile.moon_sign = moon
            user.profile.ascendant = asc
    else:
        # Create a new profile if one doesn't exist (shouldn't happen after onboarding)
        user.profile = models.UserProfile(
            user_id=user_id,
            display_name=profile_update.display_name,
            bio=profile_update.bio,
            gender=profile_update.gender,
            looking_for_gender=profile_update.looking_for_gender,
            birth_date=b_date,
            birth_time=b_time,
            birth_location=b_location,
            digipin=profile_update.digipin,
            interests=profile_update.interests,
            goals=profile_update.goals,
            relationship_intent=profile_update.relationship_intent,
            sun_sign=sun,
            moon_sign=moon,
            ascendant=asc
        )

    db.commit()
    db.refresh(user)
    return user

def get_nearby_users(db: Session, current_user_id: int, min_proximity_tier: str = "Same Locality") -> List[models.User]:
    current_user = get_user_by_id(db, current_user_id)
    if not current_user or not current_user.profile or not current_user.profile.digipin:
        return []

    nearby_users = []
    all_users = db.query(models.User).filter(models.User.id != current_user_id).all()

    proximity_tiers_order = [
        "Unknown", "Different Region", "Same Region", "Same Sub-Region",
        "Same District Circle", "Same Sub-District", "Same Locality",
        "Same Neighborhood", "Immediate Proximity", "Same Building/Complex", "Virtually Identical", "Same Spot"
    ]
    min_tier_index = proximity_tiers_order.index(min_proximity_tier)

    for user in all_users:
        if user.profile and user.profile.digipin:
            proximity_info = calculate_digipin_proximity(current_user.profile.digipin, user.profile.digipin)
            user_tier_index = proximity_tiers_order.index(proximity_info["proximity_tier"])
            
            if user_tier_index >= min_tier_index:
                nearby_users.append(user)
    
    return nearby_users


def calculate_profile_completion(user: models.User) -> float:
    score = 0
    total_fields = 12 # Total fields considered for completion

    # Essential fields (higher weight)
    if user.profile:
        if user.profile.display_name: score += 1
        if user.profile.bio and len(user.profile.bio) >= 10: score += 1
        if user.profile.gender and user.profile.gender not in ["Unknown", "Prefer Not To Say"]: score += 1
        if user.profile.interests and len(user.profile.interests) >= 3: score += 1
        if user.profile.relationship_intent and user.profile.relationship_intent != "Long Term": score += 1
        if user.profile.mbti_type and user.profile.mbti_summary: score += 1 # MBTI assessment completed
    
    if user.otp_verified: score += 1

    # Optional fields (lower weight)
    if user.profile:
        if user.profile.birth_date: score += 0.5
        if user.profile.birth_time: score += 0.5
        if user.profile.birth_location: score += 0.5
        if user.profile.digipin and user.profile.digipin != "GP-1102": score += 0.5

    # Max possible score for these criteria
    max_score = 7 + (4 * 0.5) # 7 essential + 4 optional * 0.5 weight
    
    return round((score / max_score) * 100, 2)


def create_notification(db: Session, notification: schemas.NotificationCreate) -> models.Notification:
    db_notification = models.Notification(
        user_id=notification.user_id,
        message=notification.message,
        type=notification.type
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_user_notifications(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[models.Notification]:
    return db.query(models.Notification).filter(models.Notification.user_id == user_id).offset(skip).limit(limit).all()

def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> Optional[models.Notification]:
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id
    ).first()
    if notification:
        notification.read = True
        db.commit()
        db.refresh(notification)
    return notification

def delete_notification(db: Session, notification_id: int, user_id: int):
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == user_id
    ).first()
    if notification:
        db.delete(notification)
        db.commit()
        return True
    return False


# ----------------- PERSONALITY ASSESSMENT -----------------
def generate_mbti_and_dna_via_gemini(user_profile, custom_inputs: dict) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
        
    display_name = user_profile.display_name or "New Node"
    gender = user_profile.gender or "Unknown"
    bio = user_profile.bio or ""
    
    mbti_ei = custom_inputs.get("mbti_ei", "I")
    mbti_ns = custom_inputs.get("mbti_ns", "N")
    mbti_tf = custom_inputs.get("mbti_tf", "T")
    mbti_jp = custom_inputs.get("mbti_jp", "J")
    
    interests = user_profile.interests or []
    relationship_intent = user_profile.relationship_intent or "Long Term"
    
    comm_tone = custom_inputs.get("comm_tone", "balanced")
    custom_comm_tone = custom_inputs.get("custom_comm_tone", "")
    conflict_approach = custom_inputs.get("conflict_approach", "calm")
    custom_conflict_approach = custom_inputs.get("custom_conflict_approach", "")
    connection_basis = custom_inputs.get("connection_basis", "values")
    custom_connection_basis = custom_inputs.get("custom_connection_basis", "")
    custom_cognitive = custom_inputs.get("custom_cognitive", "")
    values_focus = custom_inputs.get("values_focus", "growth")
    custom_values_focus = custom_inputs.get("custom_values_focus", "")
    custom_interests = custom_inputs.get("custom_interests", "")

    prompt = f"""
You are the Konvo Resonance Engine. Analyze the user's onboarding inputs to compute their cognitive architecture, communication style, relationship patterns, and Konvo DNA indices.

Onboarding Inputs:
- Display Name: {display_name}
- Gender: {gender}
- Bio: {bio}
- Social Energy (E/I): {mbti_ei}
- Information Processing (N/S): {mbti_ns}
- Decisive Evaluation (T/F): {mbti_tf}
- System Schedule (J/P): {mbti_jp}
- Selected Interests: {interests}
- Relationship Intent: {relationship_intent}
- Communication Tone Selection: {comm_tone} (custom typed tone: {custom_comm_tone})
- Conflict Approach Selection: {conflict_approach} (custom typed approach: {custom_conflict_approach})
- Connection Basis Selection: {connection_basis} (custom typed basis: {custom_connection_basis})
- Custom Cognitive & Communication Description: {custom_cognitive}
- Personal Values Selection: {values_focus} (custom typed values: {custom_values_focus})
- Custom Interests & Ambitions Description: {custom_interests}

Tasks:
1. Determine their MBTI personality type (must be one of the standard 16 types).
2. Calculate a confidence level (percentage between 50 and 100).
3. Draft a premium, professional summary of their archetype (e.g. "The Strategist. Highly analytical...").
4. Provide 3 specific growth areas.
5. Provide brief descriptions of their communication, relationship, and friendship styles.
6. Calculate the 9 Konvo DNA indices (values from 0.0 to 100.0) based on their text descriptions and selections:
   - dna_behavior (lifestyle consistency, routines vs spontaneity)
   - dna_personality (confidence, polarization of traits)
   - dna_communication (articulate, logical vs expressive, casual)
   - dna_relationship (desire for intimacy, depth, stability)
   - dna_emotional (vulnerability level, empathy)
   - dna_lifestyle (activity level, domestic priorities)
   - dna_interest (conceptual depth, technical vs arts)
   - dna_trust (open book vs guarded, verification readiness)
   - dna_values (objectivity, ethics, prioritization)

Output MUST be a single, valid JSON object with the following keys. Do not include markdown code block syntax. Return only raw JSON.
Keys:
- mbti_type (str)
- mbti_confidence (float)
- mbti_summary (str)
- mbti_growth_areas (list of 3 str)
- mbti_communication_style (str)
- mbti_relationship_style (str)
- mbti_friendship_style (str)
- dna_behavior (float)
- dna_personality (float)
- dna_communication (float)
- dna_relationship (float)
- dna_emotional (float)
- dna_lifestyle (float)
- dna_interest (float)
- dna_trust (float)
- dna_values (float)
- role_type (str) (e.g., "The Strategist", "The Dreamer", "The Challenger", "The Companion", "The Builder", "The Explorer")
"""
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        import httpx
        response = httpx.post(url, headers=headers, json=payload, timeout=12.0)
        if response.status_code == 200:
            res_data = response.json()
            text_resp = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:]
            if text_resp.endswith("```"):
                text_resp = text_resp[:-3]
            res_json = json.loads(text_resp.strip())
            return res_json
    except Exception as e:
        print(f"[Gemini NLP Engine] Failed generating onboarding compatibility profiles: {e}")
        
    return None

def submit_personality_assessment(db: Session, user_id: int, answers: dict, custom_inputs: dict = None):
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    if not user.profile:
        # Dynamically create profile
        prof = models.UserProfile(
            user_id=user_id,
            display_name=user.email.split("@")[0],
            gender="Unknown",
            looking_for_gender="All",
            bio="",
            relationship_intent="Long Term",
            sun_sign="Aries",
            moon_sign="Aries",
            ascendant="Aries",
            interests=[],
            goals=[]
        )
        db.add(prof)
        db.commit()
        db.refresh(user)
        
    prof = user.profile
    
    # Try Gemini NLP first, fall back to rule-based MBTI engine
    res = None
    if custom_inputs:
        res = generate_mbti_and_dna_via_gemini(prof, custom_inputs)
        
    if not res:
        res = calculate_mbti(answers)
        res["role_type"] = res.get("role_type") or "The Companion"
        res["dna_behavior"] = res["dna"].get("dna_behavior", 50.0)
        res["dna_personality"] = res["dna"].get("dna_personality", 50.0)
        res["dna_communication"] = res["dna"].get("dna_communication", 50.0)
        res["dna_relationship"] = res["dna"].get("dna_relationship", 50.0)
        res["dna_emotional"] = res["dna"].get("dna_emotional", 50.0)
        res["dna_lifestyle"] = res["dna"].get("dna_lifestyle", 50.0)
        res["dna_interest"] = res["dna"].get("dna_interest", 50.0)
        res["dna_trust"] = res["dna"].get("dna_trust", 50.0)
        res["dna_values"] = res["dna"].get("dna_values", 50.0)

    # Update profile fields
    prof.mbti_type = res["mbti_type"]
    prof.mbti_confidence = res["mbti_confidence"]
    prof.mbti_summary = res["mbti_summary"]
    prof.mbti_growth_areas = res["mbti_growth_areas"]
    prof.mbti_communication_style = res["mbti_communication_style"]
    prof.mbti_relationship_style = res["mbti_relationship_style"]
    prof.mbti_friendship_style = res["mbti_friendship_style"]
    
    # Regenerate unique ID with matching MBTI
    user.konvo_id = generate_konvo_id(res["mbti_type"])
    
    # Populate DNA indices
    prof.dna_behavior = res["dna_behavior"]
    prof.dna_personality = res["dna_personality"]
    prof.dna_communication = res["dna_communication"]
    prof.dna_relationship = res["dna_relationship"]
    prof.dna_emotional = res["dna_emotional"]
    prof.dna_lifestyle = res["dna_lifestyle"]
    prof.dna_interest = res["dna_interest"]
    prof.dna_trust = res["dna_trust"]
    prof.dna_values = res["dna_values"]
    
    db.commit()
    
    # Log telemetry
    clickhouse_client.log_behavioral_change(user_id, "MBTI_Type", 0.0, 1.0)
    clickhouse_client.log_event("PersonalityAssessmentCompleted", {"user_id": user_id, "mbti": res["mbti_type"]})
    
    # Automatically generate their AI Twin (Agent)
    generate_user_twin(db, user_id, res["role_type"])
    
    return res

def generate_avatar_via_gemini(role_type: str, display_name: str, mbti_type: str, interests: list) -> tuple:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None, None
        
    prompt = (
        f"You are a professional SVG UI/UX designer. Create a premium, state-of-the-art abstract SVG avatar for an AI Twin. "
        f"The user's archetype is '{role_type}', their MBTI type is '{mbti_type}', their name is '{display_name}', "
        f"and they are interested in: {', '.join(interests)}. "
        f"Output MUST be a single, valid JSON object with keys 'description' and 'avatar_svg'. "
        f"The 'description' should be a single premium sentence about their personality. "
        f"The 'avatar_svg' should be a complete, well-formed inline SVG tag (viewBox='0 0 100 100') using gorgeous dark-mode obsidian styles, gradients, and micro-shapes. "
        f"Do NOT wrap the response in markdown blocks. Return only raw JSON. Do not include outer markdown tags."
    )
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }
    
    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=10.0)
        if response.status_code == 200:
            res_data = response.json()
            text_resp = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Clean possible markdown wrap just in case
            if text_resp.startswith("```json"):
                text_resp = text_resp[7:]
            if text_resp.endswith("```"):
                text_resp = text_resp[:-3]
            res_json = json.loads(text_resp.strip())
            return res_json.get("avatar_svg"), res_json.get("description")
    except Exception as e:
        print(f"[Gemini Avatar API] Failed generating avatar via LLM: {e}")
        
    return None, None

def generate_user_twin(db: Session, user_id: int, role_type: str):
    user = get_user_by_id(db, user_id)
    if not user:
        return
        
    # Check if agent twin exists
    twin = db.query(models.Agent).filter(models.Agent.creator_id == user_id).first()
    
    interests = user.profile.interests if user.profile else []
    mbti_type = user.profile.mbti_type if user.profile else "Unknown"
    display_name = user.profile.display_name if user.profile else "New Node"
    
    avatar_svg, gemini_desc = generate_avatar_via_gemini(role_type, display_name, mbti_type, interests)
    
    # Simple descriptions matching role types
    descriptions = {
        "The Strategist": "An analytical, highly structured AI twin focusing on logic, patterns, and long-term synergies.",
        "The Dreamer": "A warm, values-driven AI twin inspired by conceptual arts, literature, and emotional authenticity.",
        "The Challenger": "A dialectic, sharp AI twin that enjoys querying assumptions and seeking deep truth.",
        "The Companion": "A supportive, active AI twin focused on safety, everyday stability, and mutual growth.",
        "The Explorer": "A spontaneous, travel-loving AI twin that seeks random paths, hobbies, and conceptual breakthroughs.",
        "The Builder": "An execution-focused, logical AI twin prioritizing consistent routines, metrics, and clean paths."
    }
    
    if avatar_svg and gemini_desc:
        desc = gemini_desc
    else:
        desc = descriptions.get(role_type, "A supportive AI Twin representation.")
        
    name = f"{display_name}'s Twin"
    
    if not avatar_svg:
        if twin and twin.avatar:
            avatar_svg = twin.avatar
        else:
            # Dynamic SVG avatars based on role types
            avatar_colors = {
                "The Strategist": "#4F46E5", "The Dreamer": "#EC4899", "The Challenger": "#E11D48",
                "The Companion": "#0D9488", "The Explorer": "#D97706", "The Builder": "#10B981"
            }
            color = avatar_colors.get(role_type, "#555562")
            avatar_svg = f'<svg viewBox="0 0 100 100" class="avatar-svg"><circle cx="50" cy="40" r="25" fill="{color}"/><path d="M15 85 C20 65, 80 65, 85 85" fill="{color}"/></svg>'


    if not twin:
        twin = models.Agent(
            agent_id=f"AGENT-TWIN-{user_id}", name=name, avatar=avatar_svg, description=desc,
            role_type=role_type, prompt_template=f"Represent {user.profile.display_name}'s values and styles.",
            creator_id=user_id, voice_style="Calm", emoji_style="Minimalist", match_preferences={}
        )
        db.add(twin)
    else:
        twin.role_type = role_type
        twin.description = desc
        twin.avatar = avatar_svg
        
    db.commit()
    db.refresh(twin)
    
    # Insert AI Twin memory representation in Vector DB
    vector_store.upsert(
        item_id=f"TWIN-MEM-{user_id}",
        text=f"{name} description: {desc}. MBTI: {user.profile.mbti_type}. Interests: {user.profile.interests}.",
        category="agent_memory",
        metadata={"user_id": user_id, "name": name}
    )
    
    return twin


# ----------------- SWIPE & RESISTANCE RATE LIMITING -----------------
def execute_swipe(db: Session, swiper_id: int, request: schemas.SwipeRequest) -> dict:
    today_date = date.today().isoformat()
    limit_key = f"rate:swipes:{swiper_id}:{today_date}"
    
    swiper = get_user_by_id(db, swiper_id)
    if not swiper:
        return {"success": False, "message": "User not found", "match_occurred": False}
        
    # Rate limiting configuration (Free 30, Premium 100 swipes per day)
    max_swipes = 100 if swiper.premium_user else 30
    
    # Check rate limit using Redis client
    current_swipes = redis_client.incr_rate_limit(limit_key, window_seconds=86400)
    if current_swipes > max_swipes:
        return {
            "success": False,
            "message": f"Daily swipe limit reached ({max_swipes} limit). Upgrade to premium for 100 swipes.",
            "match_occurred": False
        }

    # Record swipe in PostgreSQL
    db_swipe = models.Swipe(
        swiper_id=swiper_id,
        swipee_id=request.target_user_id,
        swipe_type=request.swipe_type
    )
    db.add(db_swipe)
    db.commit()
    
    clickhouse_client.log_event("SwipeAction", {"swiper_id": swiper_id, "swipee_id": request.target_user_id, "type": request.swipe_type})

    # Check if a Match occurred (only if swiped 'interest')
    if request.swipe_type == "interest":
        mutual = db.query(models.Swipe).filter(
            models.Swipe.swiper_id == request.target_user_id,
            models.Swipe.swipee_id == swiper_id,
            models.Swipe.swipe_type == "interest"
        ).first()
        
        if mutual:
            # Match occurs! Run Agent-to-Agent Date Simulation immediately
            sim = trigger_agent_date(db, swiper_id, request.target_user_id)
            return {
                "success": True,
                "message": "It's a Resonance Match! Your AI Twins are having a simulated date now.",
                "match_occurred": True,
                "simulation_id": sim.id
            }

    return {"success": True, "message": "Swipe logged successfully.", "match_occurred": False}


# ----------------- AGENT DATE SIMULATION -----------------
def trigger_agent_date(db: Session, user_a_id: int, user_b_id: int) -> models.AgentDateSimulation:
    import sys
    _root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if _root not in sys.path:
        sys.path.append(_root)

    user_a = get_user_by_id(db, user_a_id)
    user_b = get_user_by_id(db, user_b_id)
    
    # Fetch agents
    agent_a = user_a.agent_twin
    agent_b = user_b.agent_twin
    
    # Compute resonance compatibility
    resonance = None
    try:
        import grpc
        from services.grpc_compatibility.proto import compatibility_pb2, compatibility_pb2_grpc
        channel = grpc.insecure_channel("localhost:50051")
        stub = compatibility_pb2_grpc.CompatibilityServiceStub(channel)
        req = compatibility_pb2.CompatibilityRequest(user_id=user_a_id, partner_id=user_b_id)
        resp = stub.CalculateCompatibility(req, timeout=2.0)
        resonance = json.loads(resp.details_json)
    except Exception as e:
        print(f"[gRPC Fallback] Compatibility call failed: {e}. Running local matching calculation.")
        resonance = calculate_compatibility(user_a, user_b, db)
        
    # Run Agent date simulation
    sim_data = None
    try:
        import grpc
        from services.grpc_twin.proto import twin_pb2, twin_pb2_grpc
        channel = grpc.insecure_channel("localhost:50052")
        stub = twin_pb2_grpc.TwinServiceStub(channel)
        req = twin_pb2.TwinSimulateRequest(
            user_a_id=user_a_id,
            user_b_id=user_b_id,
            compatibility_score=resonance["overall_compatibility"]
        )
        resp = stub.SimulateDate(req, timeout=3.0)
        sim_data = {
            "environment": resp.environment,
            "dialogue_log": json.loads(resp.dialogue_log_json),
            "overall_compatibility": resonance["overall_compatibility"],
            "match_detail_json": json.loads(resp.match_detail_json)
        }
    except Exception as e:
        print(f"[gRPC Fallback] Twin simulation call failed: {e}. Running local date simulation.")
        from algorithms.date_simulator import simulate_date
        sim_data = simulate_date(agent_a, agent_b, resonance)
    
    db_sim = models.AgentDateSimulation(
        user_a_id=user_a_id, user_b_id=user_b_id,
        environment=sim_data["environment"],
        dialogue_log=sim_data["dialogue_log"],
        overall_compatibility=sim_data["overall_compatibility"],
        match_detail_json=sim_data["match_detail_json"],
        approval_user_a="pending",
        approval_user_b="pending"
    )
    db.add(db_sim)
    db.commit()
    db.refresh(db_sim)
    
    # Write relationship nodes/edges to Neo4j Graph
    neo4j_client.add_relationship(user_a_id, user_b_id, "HumanRelationship", weight=resonance["overall_compatibility"])
    neo4j_client.add_relationship(user_a_id, user_b_id, "StartupRelationship", weight=resonance["startup_compatibility"] if "startup_compatibility" in resonance else 50.0)
    
    # Log clickhouse events
    clickhouse_client.log_agent_usage(agent_a.agent_id, 100, 300)
    clickhouse_client.log_event("AgentDateSimulated", {"simulation_id": db_sim.id, "compatibility": resonance["overall_compatibility"]})
    
    return db_sim

def approve_date_simulation(db: Session, sim_id: int, user_id: int, approval_action: str) -> models.AgentDateSimulation:
    sim = db.query(models.AgentDateSimulation).filter(models.AgentDateSimulation.id == sim_id).first()
    if not sim:
        return None
        
    if sim.user_a_id == user_id:
        sim.approval_user_a = approval_action
    elif sim.user_b_id == user_id:
        sim.approval_user_b = approval_action
        
    db.commit()
    clickhouse_client.log_event("DateApproved", {"simulation_id": sim_id, "user_id": user_id, "action": approval_action})
    return sim


# ----------------- DIRECT HUMAN CHATS -----------------
def create_chat_message(db: Session, sender_id: int, receiver_id: int, content: str) -> models.ChatMessage:
    # Verify both users have approved the match (Human Approval check)
    sim = db.query(models.AgentDateSimulation).filter(
        ((models.AgentDateSimulation.user_a_id == sender_id) & (models.AgentDateSimulation.user_b_id == receiver_id)) |
        ((models.AgentDateSimulation.user_a_id == receiver_id) & (models.AgentDateSimulation.user_b_id == sender_id))
    ).first()
    
    if not sim or sim.approval_user_a != "approved" or sim.approval_user_b != "approved":
        # Cannot chat until both approve
        raise ValueError("Chat remains locked. Both users must approve the AI Twin date simulation first.")

    db_msg = models.ChatMessage(
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content,
        reactions=[]
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    
    # Track message analytics in ClickHouse
    clickhouse_client.log_sentiment(len(content), 0.5, 0.5, 0.0) # telemetry logs
    
    # Expose interaction in Neo4j (increment weight of relationship)
    neo4j_client.add_relationship(sender_id, receiver_id, "HumanRelationship", weight=99.0)
    
    return db_msg
