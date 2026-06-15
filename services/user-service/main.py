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

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import crud
from auth_helper import get_current_user
from algorithms.astrology import calculate_astrology
from datetime import time
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
        raise HTTPException(status_code=404, detail="Profile not found")
        
    prof.display_name = request.display_name
    prof.bio = request.bio
    prof.gender = request.gender
    prof.birth_date = request.birth_date
    prof.birth_time = request.birth_time
    prof.birth_location = request.birth_location
    prof.digipin = request.digipin
    prof.interests = request.interests
    prof.goals = request.goals
    prof.relationship_intent = request.relationship_intent
    
    # Recalculate horoscope signs if birth date/location updated
    if request.birth_date and request.birth_location:
        b_time = request.birth_time or prof.birth_time or time(12, 0)
        astro = calculate_astrology(request.birth_date, b_time, request.birth_location)
        prof.sun_sign = astro["sun_sign"]
        prof.moon_sign = astro["moon_sign"]
        prof.ascendant = astro["ascendant"]
        
    db.commit()
    return {"success": True, "message": "Profile updated successfully."}

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
        
    b_time = prof.birth_time or time(12, 0)
    res = calculate_astrology(prof.birth_date, b_time, prof.birth_location)
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


