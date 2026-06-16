import sys
import os
_curr = os.path.abspath(__file__)
_root = os.getcwd()
while _curr:
    if os.path.exists(os.path.join(_curr, "services")) and os.path.exists(os.path.join(_curr, "packages")):
        _root = _curr
        break
    _parent = os.path.dirname(_curr)
    if _parent == _curr:
        _root = os.getcwd()
        break
    _curr = _parent

sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import crud
from auth_helper import get_current_user
from redis_client import redis_client
from algorithms.astrology import calculate_astrology
import algorithms.onboarding_engine as onboarding_engine
from datetime import time, datetime, date
import base64
import json
from hashlib import sha256
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

app = FastAPI(title="User Profile Service", version="1.0.0")

@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.post("/api/users/assessment")
def submit_assessment(
    submission: schemas.AssessmentSubmission,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    res = crud.submit_personality_assessment(db, current_user.id, submission.answers, submission.custom_inputs)
    if not res:
        raise HTTPException(status_code=400, detail="Failed to process personality assessment.")
    return res

@app.put("/api/users/profile")
def update_profile(
    request: schemas.ProfileUpdateRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prof = current_user.profile
    if not prof:
        prof = models.UserProfile(
            user_id=current_user.id,
            display_name=request.display_name or current_user.email.split("@")[0],
            gender=request.gender or "Unknown",
            looking_for_gender=request.looking_for_gender or "All",
            bio=request.bio or "",
            relationship_intent=request.relationship_intent or "Long Term",
            sun_sign="Aries",
            moon_sign="Aries",
            ascendant="Aries",
            interests=[],
            goals=[]
        )
        db.add(prof)
        db.commit()
        db.refresh(current_user)
        prof = current_user.profile
        
    prof.display_name = request.display_name
    prof.bio = request.bio
    prof.gender = request.gender
    prof.looking_for_gender = request.looking_for_gender
    prof.birth_date = request.birth_date
    prof.birth_time = request.birth_time
    prof.birth_location = request.birth_location
    prof.digipin = request.digipin
    prof.interests = request.interests
    prof.goals = request.goals
    prof.relationship_intent = request.relationship_intent
    if request.avatar_url is not None:
        prof.avatar_url = request.avatar_url
    
    # Recalculate horoscope signs if birth date/location updated
    if request.birth_date and request.birth_location:
        try:
            b_time = request.birth_time or prof.birth_time or time(12, 0)
            astro = calculate_astrology(request.birth_date, b_time, request.birth_location)
            prof.sun_sign = astro["sun_sign"]
            prof.moon_sign = astro["moon_sign"]
            prof.ascendant = astro["ascendant"]
        except Exception as e:
            print(f"[Horoscope Error] Failed to calculate astrology: {e}")
            if not prof.sun_sign:
                prof.sun_sign = "Aries"
            if not prof.moon_sign:
                prof.moon_sign = "Aries"
            if not prof.ascendant:
                prof.ascendant = "Aries"
        
    db.commit()
    return {"success": True, "message": "Profile updated successfully."}


@app.post("/api/users/profile/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi import UploadFile, File, HTTPException
    from PIL import Image
    import io
    import uuid
    
    # Enforce file format checks (.png, .jpg, .jpeg)
    filename_lower = file.filename.lower()
    if not (filename_lower.endswith('.png') or filename_lower.endswith('.jpg') or filename_lower.endswith('.jpeg')):
        raise HTTPException(
            status_code=400,
            detail="Invalid file extension. Only .png, .jpg, and .jpeg are allowed."
        )
    
    if file.content_type not in ["image/png", "image/jpeg", "image/jpg"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid content type. Only image/png, image/jpeg, or image/jpg are allowed."
        )
    
    prof = current_user.profile
    if not prof:
        prof = models.UserProfile(
            user_id=current_user.id,
            display_name=current_user.email.split("@")[0],
            gender="Unknown",
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
        db.refresh(current_user)
        prof = current_user.profile

    try:
        image_bytes = file.file.read()
        try:
            img = Image.open(io.BytesIO(image_bytes))
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image file format")
            
        # Center crop to square
        width, height = img.size
        min_dim = min(width, height)
        left = (width - min_dim) // 2
        top = (height - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        
        img_cropped = img.crop((left, top, right, bottom))
        
        # Resize to 512x512
        img_resized = img_cropped.resize((512, 512), Image.Resampling.LANCZOS)
        
        # Convert to RGB or RGBA depending on transparency
        if img_resized.mode in ("RGBA", "LA") or (img_resized.mode == "P" and "transparency" in img_resized.info):
            img_final = img_resized.convert("RGBA")
        else:
            img_final = img_resized.convert("RGB")
            
        import base64
        
        buffer = io.BytesIO()
        img_final.save(buffer, format="WEBP", quality=90)
        webp_bytes = buffer.getvalue()
        base64_str = base64.b64encode(webp_bytes).decode("utf-8")
        avatar_url = f"data:image/webp;base64,{base64_str}"
        
        prof.avatar_url = avatar_url
        db.commit()
        
        return {"success": True, "avatar_url": avatar_url}
        
    except HTTPException as he:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=he.status_code, content={"detail": he.detail})
    except Exception as e:
        db.rollback()
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to process and upload avatar image: {str(e)}"}
        )

@app.get("/api/users/onboarding-draft", response_model=schemas.OnboardingDraft)
def get_onboarding_draft(current_user: models.User = Depends(get_current_user)):
    draft_key = f"onboarding_draft:{current_user.id}"
    draft_str = redis_client.get_val(draft_key)
    if not draft_str:
        return {"step": 0, "data": {}}
    try:
        return json.loads(draft_str)
    except Exception:
        return {"step": 0, "data": {}}

@app.put("/api/users/onboarding-draft")
def save_onboarding_draft(
    draft: schemas.OnboardingDraft,
    current_user: models.User = Depends(get_current_user)
):
    draft_key = f"onboarding_draft:{current_user.id}"
    payload = {
        "step": draft.step,
        "data": draft.data
    }
    redis_client.set_val(draft_key, json.dumps(payload), ex_seconds=86400 * 30)
    return {"success": True, "message": "Draft saved successfully."}

@app.get("/api/users/profile/{konvo_id}", response_model=schemas.UserResponse)
def read_user_profile(konvo_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.konvo_id == konvo_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users/me/astrology", response_model=schemas.AstrologyResponse)
def read_user_astrology(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prof = current_user.profile
    if not prof or not prof.birth_date or not prof.birth_location:
        raise HTTPException(status_code=400, detail="Birth Date and Birth Location are required for Horoscope calculation.")
        
    try:
        b_time = prof.birth_time or time(12, 0)
        res = calculate_astrology(prof.birth_date, b_time, prof.birth_location)
    except Exception as e:
        print(f"[Horoscope Error] Failed to calculate astrology in read_user_astrology: {e}")
        res = {
            "sun_sign": prof.sun_sign or "Aries",
            "moon_sign": prof.moon_sign or "Aries",
            "ascendant": prof.ascendant or "Aries",
            "location": prof.birth_location or "Unknown",
            "personality_insights": "Astrology compilation is currently calibrating. Please verify birth details.",
            "communication_tendencies": "Analysis pending profile alignment.",
            "emotional_dna": "Vulnerability matrix processing.",
            "life_pattern_report": "Horoscope report queued.",
            "disclaimer": "Provided for social resonance calibration only."
        }
    return {
        "sun_sign": res["sun_sign"],
        "moon_sign": res["moon_sign"],
        "ascendant": res["ascendant"],
        "location": res["location"],
        "personality_insights": res["personality_insights"],
        "communication_tendencies": res["communication_tendencies"],
        "emotional_dna": res["emotional_dna"],
        "life_pattern_report": res["life_pattern_report"],
        "disclaimer": res["disclaimer"]
    }

@app.get("/api/users/me/trust", response_model=schemas.TrustDashboardResponse)
def read_trust_dashboard(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate profile completion progress (0-100)
    completion = 20.0 # base email/phone
    prof = current_user.profile
    if prof:
        if prof.display_name: completion += 15.0
        if prof.bio: completion += 15.0
        if prof.birth_date: completion += 15.0
        if prof.mbti_type: completion += 15.0
    if current_user.otp_verified:
        completion += 20.0

    # Retrieve trust index
    trust_score = 70.0
    behavior_score = 70.0
    # Query baseline fingerprint if exists
    fp = db.query(models.BehavioralFingerprint).filter(models.BehavioralFingerprint.user_id == current_user.id).first()
    if fp:
        trust_score = fp.trust_index
        behavior_score = fp.listening_score * 0.5 + fp.empathy_index * 0.5

    safety_history = ["Account created.", "Device fingerprint validated."]
    if current_user.otp_verified:
        safety_history.append("Phone number verified via OTP.")
    if fp and fp.trust_index > 75.0:
        safety_history.append("High trust history index maintained.")

    return {
        "otp_verified": current_user.otp_verified,
        "trust_score": trust_score,
        "profile_completion": completion,
        "behavior_score": behavior_score,
        "safety_history": safety_history
    }


def encrypt_data(data: dict, passphrase: str) -> str:
    key = sha256(passphrase.encode("utf-8")).digest()
    iv = os.urandom(16)
    plaintext = json.dumps(data).encode("utf-8")
    padding_len = 16 - (len(plaintext) % 16)
    plaintext += bytes([padding_len] * padding_len)
    
    encryptor = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend()
    ).encryptor()
    ciphertext = encryptor.update(plaintext) + encryptor.finalize()
    
    payload = {
        "iv": base64.b64encode(iv).decode("utf-8"),
        "ciphertext": base64.b64encode(ciphertext).decode("utf-8")
    }
    return json.dumps(payload)


@app.get("/api/admin/data")
def get_admin_data(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    user_list = []
    for u in users:
        user_list.append({
            "id": u.id,
            "email": u.email,
            "konvo_id": u.konvo_id,
            "role": u.role,
            "otp_verified": u.otp_verified,
            "premium_user": u.premium_user,
            "display_name": u.profile.display_name if u.profile else "N/A",
            "gender": u.profile.gender if u.profile else "N/A",
            "digipin": u.profile.digipin if u.profile else "N/A",
            "mbti": u.profile.mbti_type if u.profile else "N/A",
            "created_at": u.created_at.isoformat() if u.created_at else "N/A"
        })
        
    metrics = {
        "total_users": len(users),
        "verified_users": len([u for u in users if u.otp_verified]),
        "premium_users": len([u for u in users if u.premium_user]),
    }
    
    raw_payload = {
        "users": user_list,
        "metrics": metrics
    }
    
    passphrase = os.getenv("ADMIN_PASSPHRASE", "supersecureadminpass123")
    encrypted_str = encrypt_data(raw_payload, passphrase)
    return {"data": encrypted_str}


@app.get("/api/users/fingerprint/ledger")
def get_fingerprint_ledger(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ledger = db.query(models.BehavioralLedger).filter(models.BehavioralLedger.user_id == current_user.id).order_by(models.BehavioralLedger.timestamp.desc()).all()
    return [
        {
            "id": item.id,
            "metric_changed": item.metric_changed,
            "previous_value": item.previous_value,
            "new_value": item.new_value,
            "delta": item.delta,
            "reason": item.reason,
            "timestamp": item.timestamp.isoformat()
        }
        for item in ledger
    ]


from pydantic import BaseModel

class AdminUpdateUserPerksRequest(BaseModel):
    user_id: int
    premium_user: bool
    role: str
    passphrase: str

@app.post("/api/admin/update-perks")
def update_user_perks(request: AdminUpdateUserPerksRequest, db: Session = Depends(get_db)):
    stored_pass = os.getenv("ADMIN_PASSPHRASE", "supersecureadminpass123")
    if request.passphrase != stored_pass:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid security passphrase")
        
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User node not found")
        
    user.premium_user = request.premium_user
    user.role = request.role
    db.commit()
    
    return {"success": True, "message": f"User {user.email} perks updated successfully."}


class AdminAddUserRequest(BaseModel):
    email: str
    password: str
    display_name: str
    phone: str
    gender: str = "Unknown"
    relationship_intent: str = "Long Term"
    passphrase: str

def sanitize_msg(msg: str) -> str:
    return msg.replace("-", " ")

@app.post("/api/admin/adduser")
def admin_add_user(request: AdminAddUserRequest, db: Session = Depends(get_db)):
    stored_pass = os.getenv("ADMIN_PASSPHRASE", "supersecureadminpass123")
    if request.passphrase != stored_pass:
        raise HTTPException(status_code=401, detail="Unauthorized invalid security passphrase")
        
    existing = crud.get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered in system")
        
    reg_data = schemas.UserRegister(
        email=request.email,
        password=request.password,
        display_name=request.display_name,
        phone=request.phone,
        gender=request.gender,
        relationship_intent=request.relationship_intent,
        interests=[],
        goals=[]
    )
    
    try:
        new_user = crud.create_user(db, reg_data)
        new_user.otp_verified = True
        db.commit()
        return {"success": True, "user_id": new_user.id}
    except Exception as e:
        db.rollback()
        err_msg = sanitize_msg(str(e))
        raise HTTPException(status_code=500, detail=f"Database insertion failed {err_msg}")


class AdminDeleteUserRequest(BaseModel):
    user_id: int
    passphrase: str

@app.post("/api/admin/deleteuser")
def admin_delete_user(request: AdminDeleteUserRequest, db: Session = Depends(get_db)):
    stored_pass = os.getenv("ADMIN_PASSPHRASE", "supersecureadminpass123")
    if request.passphrase != stored_pass:
        raise HTTPException(status_code=401, detail="Unauthorized invalid security passphrase")
        
    user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        db.delete(user)
        db.commit()
        return {"success": True, "message": "User deleted successfully"}
    except Exception as e:
        db.rollback()
        err_msg = sanitize_msg(str(e))
        raise HTTPException(status_code=500, detail=f"Deletion failed {err_msg}")


@app.post("/api/onboarding/init")
def onboarding_init(
    request: schemas.CalibrationInitRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate age
    try:
        b_date = datetime.strptime(request.birth_date, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - b_date.year - ((today.month, today.day) < (b_date.month, b_date.day))
    except Exception:
        age = 22

    # Save to UserProfile basic data
    prof = current_user.profile
    if not prof:
        prof = models.UserProfile(
            user_id=current_user.id,
            display_name=current_user.email.split("@")[0],
        )
        db.add(prof)
        db.flush()
        
    prof.gender = request.gender
    prof.birth_date = datetime.strptime(request.birth_date, "%Y-%m-%d").date() if request.birth_date else None
    if request.birth_time:
        try:
            prof.birth_time = datetime.strptime(request.birth_time, "%H:%M").time()
        except Exception:
            pass
    prof.birth_location = request.birth_location
    prof.digipin = request.digipin
    
    # Calculate astrology
    if prof.birth_date and prof.birth_location:
        try:
            b_time = prof.birth_time or time(12, 0)
            astro = calculate_astrology(prof.birth_date, b_time, prof.birth_location)
            prof.sun_sign = astro["sun_sign"]
            prof.moon_sign = astro["moon_sign"]
            prof.ascendant = astro["ascendant"]
        except Exception as e:
            print(f"[Astrology Error] {e}")
            
    db.commit()

    # Initialize Redis session
    session_key = f"calibration_session:{current_user.id}"
    session_data = {
        "demographics": {
            "gender": request.gender,
            "age": age,
            "digipin": request.digipin,
            "language": request.language
        },
        "history": []
    }
    redis_client.set_val(session_key, json.dumps(session_data), ex_seconds=3600)

    # Generate first question
    first_q = onboarding_engine.generate_next_question(session_data["demographics"], [])
    return {"success": True, "question": first_q}


@app.get("/api/onboarding/question")
def onboarding_question(
    current_user: models.User = Depends(get_current_user)
):
    session_key = f"calibration_session:{current_user.id}"
    session_str = redis_client.get_val(session_key)
    if not session_str:
        raise HTTPException(status_code=400, detail="Calibration session not initialized.")
        
    session_data = json.loads(session_str)
    q = onboarding_engine.generate_next_question(
        session_data["demographics"],
        session_data["history"]
    )
    return q


@app.post("/api/onboarding/answer")
def onboarding_answer(
    request: schemas.CalibrationAnswerRequest,
    current_user: models.User = Depends(get_current_user)
):
    session_key = f"calibration_session:{current_user.id}"
    session_str = redis_client.get_val(session_key)
    if not session_str:
        raise HTTPException(status_code=400, detail="Calibration session not initialized.")
        
    session_data = json.loads(session_str)
    
    # Append answer
    session_data["history"].append({
        "question_text": request.question_text,
        "question_type": request.question_type,
        "answer_text": request.answer_text,
        "latency_ms": request.latency_ms
    })
    
    # Save back to Redis
    redis_client.set_val(session_key, json.dumps(session_data), ex_seconds=3600)
    
    # Generate next question
    next_q = onboarding_engine.generate_next_question(
        session_data["demographics"],
        session_data["history"]
    )
    return {"success": True, "question": next_q}


@app.post("/api/onboarding/complete")
def onboarding_complete(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_key = f"calibration_session:{current_user.id}"
    session_str = redis_client.get_val(session_key)
    if not session_str:
        raise HTTPException(status_code=400, detail="Calibration session not initialized or expired.")
        
    session_data = json.loads(session_str)
    demographics = session_data["demographics"]
    history = session_data["history"]
    
    if not history:
        raise HTTPException(status_code=400, detail="No answers recorded.")
        
    # Analyze and save
    res = onboarding_engine.analyze_calibration(db, current_user.id, demographics, history)
    
    # Clear session
    redis_client.set_val(session_key, "", ex_seconds=1)
    
    return {"success": True, "profile": res}



