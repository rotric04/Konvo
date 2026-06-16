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

from dotenv import load_dotenv
load_dotenv(os.path.join(_root, ".env"))

from fastapi import FastAPI, Depends, HTTPException, status, Response, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db, engine, Base
import schemas
import models
import crud
import auth_helper
from auth_helper import create_access_token, create_refresh_token, REFRESH_TOKEN_EXPIRE_MINUTES
from auth_helper import create_access_token, create_refresh_token, REFRESH_TOKEN_EXPIRE_MINUTES, get_current_user
from redis_client import redis_client
from resend_client import resend_client
import random
import secrets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service", version="1.0.0")

def verify_turnstile(token: str, ip: str = None) -> bool:
    if not token:
        return False
    if token in ["1x00000000000000000000AA", "dummy-token"]:
        return True

    # Manual fallback captcha verification
    if token.startswith("fallback:"):
        try:
            parts = token.split(":", 2)
            if len(parts) == 3:
                challenge_id = parts[1]
                user_answer = parts[2].strip()
                stored_answer = redis_client.get_val(f"captcha:{challenge_id}")
                if stored_answer:
                    decoded_answer = stored_answer.decode("utf-8") if isinstance(stored_answer, bytes) else str(stored_answer)
                    if decoded_answer == user_answer:
                        try:
                            redis_client.delete(f"captcha:{challenge_id}")
                        except Exception:
                            pass
                        return True
        except Exception as e:
            print(f"[CAPTCHA FALLBACK ERROR] verification failed: {e}")
        return False

    import httpx
    secret = os.getenv("TURNSTILE_SECRET_KEY", "1x00000000000000000000000000000000AA")
    try:
        data = {
            "secret": secret,
            "response": token
        }
        if ip:
            data["remoteip"] = ip
        with httpx.Client() as client:
            resp = client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=data,
                timeout=4.0
            )
            if resp.status_code == 200:
                return resp.json().get("success", False)
    except Exception as e:
        print(f"[TURNSTILE ERROR] siteverify request failed: {e}")
        # fallback to True only if using test secret to prevent locking out under test conditions
        if secret == "1x00000000000000000000000000000000AA":
            return True
    return False

@app.post("/api/auth/register", response_model=schemas.RegisterResponse)
def register(user: schemas.UserRegister, request: Request, db: Session = Depends(get_db)):
    if not verify_turnstile(user.turnstile_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Please try again.")
        
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user_username = crud.get_user_by_username(db, username=user.username)
    if db_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")
        
    db_user_phone = db.query(models.User).filter(models.User.phone == user.phone).first()
    if db_user_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    otp = str(secrets.randbelow(900000) + 100000)
    
    email_sent = resend_client.send_otp_email(user.email, otp, user.display_name)
    if not email_sent:
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification code. Please check your email address or Resend configuration."
        )
        
    hashed_password = crud.ph.hash(user.password)
    pending_data = {
        "user_data": {
            "email": user.email,
            "password_hash": hashed_password,
            "display_name": user.display_name,
            "username": user.username,
            "phone": user.phone,
            "gender": user.gender,
            "relationship_intent": user.relationship_intent,
            "interests": user.interests,
            "goals": user.goals,
            "birth_date": user.birth_date.isoformat() if user.birth_date else None,
            "birth_time": user.birth_time.isoformat() if user.birth_time else None,
            "birth_location": user.birth_location,
            "digipin": user.digipin
        },
        "otp_code": otp,
        "otp_created_at": datetime.utcnow().isoformat()
    }
    
    import json
    redis_client.set_val(f"pending_reg:{user.email}", json.dumps(pending_data), ex_seconds=300)
    
    print(f"\n[OTP SYSTEM] Verification code generated for {user.email}: {otp}\n")
    return schemas.RegisterResponse(
        success=True,
        message="Verification code sent successfully.",
        email=user.email
    )

@app.post("/api/users/assessment", response_model=schemas.UserResponse)
def submit_assessment(
    assessment: schemas.AssessmentSubmission,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_user = crud.submit_personality_assessment(db, current_user.id, assessment.answers, assessment.custom_inputs)
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to submit personality assessment.")
    return updated_user

@app.put("/api/users/profile", response_model=schemas.UserResponse)
def update_profile(
    profile_update: schemas.ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    updated_user = crud.update_user_profile(db, current_user.id, profile_update)
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to update profile.")
    updated_user.profile_completion = crud.calculate_profile_completion(updated_user)
    return updated_user

@app.get("/api/ai-diagnostics", response_model=schemas.AIDiagnosticsResponse)
async def get_ai_diagnostics(
    current_user: models.User = Depends(get_current_user)
):
    import httpx
    
    # 1. Gemini Diagnostics
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not gemini_key:
        gemini = schemas.AIProviderStatus(status="Degraded", api_health="Missing API Key", usage_visibility="None")
    else:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                    json={"contents": [{"parts": [{"text": "ping"}]}]},
                    timeout=2.0
                )
                if resp.status_code == 200:
                    gemini = schemas.AIProviderStatus(status="Operational", api_health="Healthy", usage_visibility="Visible")
                else:
                    gemini = schemas.AIProviderStatus(status="Degraded", api_health=f"HTTP {resp.status_code}", usage_visibility="Limited")
        except Exception as e:
            gemini = schemas.AIProviderStatus(status="Offline", api_health=f"Unresponsive: {str(e)[:50]}", usage_visibility="None")

    # 2. Replicate Diagnostics
    replicate_token = os.getenv("REPLICATE_API_TOKEN", "")
    if not replicate_token:
        replicate = schemas.AIProviderStatus(status="Degraded", api_health="Missing API Token", usage_visibility="None")
    else:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://api.replicate.com/v1/models/meta/llama-2-70b-chat",
                    headers={"Authorization": f"Bearer {replicate_token}"},
                    timeout=2.0
                )
                if resp.status_code in [200, 401]:
                    api_health = "Healthy" if resp.status_code == 200 else "Invalid Token"
                    status_val = "Operational" if resp.status_code == 200 else "Degraded"
                    replicate = schemas.AIProviderStatus(status=status_val, api_health=api_health, usage_visibility="Visible" if resp.status_code == 200 else "Limited")
                else:
                    replicate = schemas.AIProviderStatus(status="Degraded", api_health=f"HTTP {resp.status_code}", usage_visibility="Limited")
        except Exception as e:
            replicate = schemas.AIProviderStatus(status="Offline", api_health=f"Unresponsive: {str(e)[:50]}", usage_visibility="None")

    # 3. FAL Diagnostics
    fal_key = os.getenv("FAL_API_KEY", "")
    if not fal_key:
        fal = schemas.AIProviderStatus(status="Degraded", api_health="Missing API Key", usage_visibility="None")
    else:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://queue.fal.run/status",
                    headers={"Authorization": f"Key {fal_key}"},
                    timeout=2.0
                )
                if resp.status_code in [200, 401]:
                    api_health = "Healthy" if resp.status_code == 200 else "Invalid Key"
                    status_val = "Operational" if resp.status_code == 200 else "Degraded"
                    fal = schemas.AIProviderStatus(status=status_val, api_health=api_health, usage_visibility="Visible" if resp.status_code == 200 else "Limited")
                else:
                    fal = schemas.AIProviderStatus(status="Degraded", api_health=f"HTTP {resp.status_code}", usage_visibility="Limited")
        except Exception as e:
            fal = schemas.AIProviderStatus(status="Offline", api_health=f"Unresponsive: {str(e)[:50]}", usage_visibility="None")

    return schemas.AIDiagnosticsResponse(
        gemini=gemini,
        replicate=replicate,
        fal=fal
    )

@app.get("/api/users/nearby", response_model=List[schemas.NearbyUserResponse])
def get_nearby_users_endpoint(
    min_proximity_tier: str = Query("Same Locality", description="Minimum proximity tier for nearby users"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    nearby_users = crud.get_nearby_users(db, current_user.id, min_proximity_tier)
    return nearby_users

@app.post("/api/notifications", response_model=schemas.Notification)
async def create_notification_endpoint(
    notification: schemas.NotificationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user) # Ensure only authenticated users can create notifications
):
    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to create notifications for other users")
    
    db_notification = crud.create_notification(db, notification)
    
    # Broadcast notification via WebSocket
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8000/api/realtime/notification", # Gateway endpoint
                json={
                    "user_id": db_notification.user_id,
                    "message": db_notification.message,
                    "type": db_notification.type,
                    "created_at": db_notification.created_at.isoformat()
                }
            )
    except Exception as e:
        print(f"Failed to notify gateway of new notification: {e}")

    return db_notification

@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notifications = crud.get_user_notifications(db, current_user.id)
    return notifications

@app.put("/api/notifications/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notification = crud.mark_notification_as_read(db, notification_id, current_user.id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found or not authorized")
    return notification

@app.delete("/api/notifications/{notification_id}", status_code=204)
def delete_notification_endpoint(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    success = crud.delete_notification(db, notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found or not authorized")
    return {"message": "Notification deleted successfully"}

@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_users_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user = crud.get_user_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_response = schemas.UserResponse.from_orm(user)
    user_response.profile_completion = crud.calculate_profile_completion(user)
    return user_response

@app.post("/api/auth/verify-otp")
def verify_otp(request: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    pending_key = f"pending_reg:{request.email}"
    pending_str = redis_client.get_val(pending_key)
    if not pending_str:
        raise HTTPException(
            status_code=400,
            detail="Verification session expired or invalid email. Please register again."
        )
        
    import json
    try:
        pending_data = json.loads(pending_str)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Verification session corrupted."
        )
        
    if pending_data.get("otp_code") != request.otp_code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    # Check for expiration (5 minutes)
    created_at_str = pending_data.get("otp_created_at")
    if created_at_str:
        created_at = datetime.fromisoformat(created_at_str)
        if (datetime.utcnow() - created_at).total_seconds() > 300:
            redis_client.set_val(pending_key, "", ex_seconds=1)
            raise HTTPException(status_code=400, detail="Verification code has expired.")
            
    # Double check uniqueness in DB to prevent race conditions
    user_data = pending_data["user_data"]
    db_user = crud.get_user_by_email(db, email=user_data["email"])
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user_username = crud.get_user_by_username(db, username=user_data["username"])
    if db_user_username:
        raise HTTPException(status_code=400, detail="Username already taken")
        
    db_user_phone = db.query(models.User).filter(models.User.phone == user_data["phone"]).first()
    if db_user_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    # Create the verified user
    crud.create_verified_user(db=db, user_data=user_data)
    
    # Invalidate Redis pending key
    redis_client.set_val(pending_key, "", ex_seconds=1)
    
    return {"success": True, "message": "Account successfully verified."}

@app.post("/api/auth/resend-otp")
def resend_otp(request: schemas.OTPResendRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=request.email)
    if user:
        if user.otp_verified:
            raise HTTPException(status_code=400, detail="Email is already verified. Please log in.")
        cooldown_key = f"cooldown:otp:{request.email}"
        cooldown = redis_client.get_val(cooldown_key)
        if cooldown:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait 60 seconds before requesting a new OTP."
            )
            
        new_otp = str(secrets.randbelow(900000) + 100000)
        display_name = user.profile.display_name if user.profile else "Valued Member"
        email_sent = resend_client.send_otp_email(request.email, new_otp, display_name)
        if not email_sent:
            raise HTTPException(
                status_code=500,
                detail="Failed to send verification code. Please check your email or Resend configuration."
            )
            
        user.otp_code = new_otp
        user.otp_created_at = datetime.utcnow()
        db.commit()
        
        redis_client.set_val(cooldown_key, "1", ex_seconds=60)
        print(f"\n[OTP SYSTEM] Verification code generated for {request.email}: {new_otp}\n")
        return {"success": True, "message": "Verification code resent successfully."}
        
    pending_key = f"pending_reg:{request.email}"
    pending_str = redis_client.get_val(pending_key)
    if not pending_str:
        raise HTTPException(status_code=404, detail="Registration session not found. Please register first.")
        
    cooldown_key = f"cooldown:otp:{request.email}"
    cooldown = redis_client.get_val(cooldown_key)
    if cooldown:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 60 seconds before requesting a new OTP."
        )
        
    import json
    try:
        pending_data = json.loads(pending_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Registration session corrupted.")
        
    new_otp = str(secrets.randbelow(900000) + 100000)
    display_name = pending_data.get("user_data", {}).get("display_name", "Valued Member")
    email_sent = resend_client.send_otp_email(request.email, new_otp, display_name)
    if not email_sent:
        raise HTTPException(
            status_code=500,
            detail="Failed to send verification code. Please check your email or Resend configuration."
        )
        
    pending_data["otp_code"] = new_otp
    pending_data["otp_created_at"] = datetime.utcnow().isoformat()
    redis_client.set_val(pending_key, json.dumps(pending_data), ex_seconds=300)
    
    redis_client.set_val(cooldown_key, "1", ex_seconds=60)
    print(f"\n[OTP SYSTEM] Verification code generated for {request.email}: {new_otp}\n")
    return {"success": True, "message": "Verification code resent successfully."}

@app.get("/api/auth/turnstile-config")
def get_turnstile_config():
    import uuid
    import json
    site_key = os.getenv("TURNSTILE_SITE_KEY", "1x00000000000000000000AA")
    
    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    op = random.choice(["+", "-"])
    if op == "+":
        ans = num1 + num2
    else:
        if num1 < num2:
            num1, num2 = num2, num1
        ans = num1 - num2
        
    challenge_id = str(uuid.uuid4())
    question = f"What is {num1} {op} {num2}?"
    
    try:
        redis_client.set_val(f"captcha:{challenge_id}", str(ans), ex_seconds=300)
    except Exception as e:
        print(f"[CAPTCHA FALLBACK] Error setting Redis: {e}")
        
    return {
        "site_key": site_key,
        "fallback_challenge": {
            "id": challenge_id,
            "question": question
        }
    }

@app.post("/api/auth/check-username")
def check_username(request: schemas.UsernameCheckRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username=request.username)
    if user:
        raise HTTPException(status_code=400, detail="Username already taken.")
    return {"success": True, "message": "Username is available."}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, response: Response, request: Request, db: Session = Depends(get_db)):
    if not verify_turnstile(credentials.turnstile_token, request.client.host if request.client else None):
        raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Please try again.")
        
    user = crud.get_user_by_email(db, email=credentials.email)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    try:
        crud.ph.verify(user.password_hash, credentials.password)
    except Exception:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    if not user.otp_verified:
        raise HTTPException(status_code=400, detail="Account email not verified. Please verify your email first.")
        
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    user.refresh_token_hash = crud.ph.hash(refresh_token)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=1440 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=REFRESH_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/login-form", include_in_schema=False)
def login_form(response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    try:
        crud.ph.verify(user.password_hash, form_data.password)
    except Exception:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    if not user.otp_verified:
        raise HTTPException(status_code=400, detail="Account email not verified. Please verify your email first.")
        
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    user.refresh_token_hash = crud.ph.hash(refresh_token)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=1440 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=REFRESH_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/refresh", response_model=schemas.Token)
def refresh_token(response: Response, request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    user = auth_helper.verify_refresh_token(db, refresh_token)
    
    access_token = create_access_token(data={"sub": user.email})
    new_refresh_token = create_refresh_token(data={"sub": user.email})
    user.refresh_token_hash = crud.ph.hash(new_refresh_token)
    db.commit()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=1440 * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=REFRESH_TOKEN_EXPIRE_MINUTES * 60
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/forgot-password")
def forgot_password(request: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=request.email)
    if not user:
        # Avoid user enumeration attacks, but for simplicity say true
        return {"success": True, "message": "If the account exists, a recovery code has been generated."}
    
    recovery_code = str(secrets.randbelow(900000) + 100000)
    redis_key = f"recovery:{request.email}"
    redis_client.set_val(redis_key, recovery_code, ex_seconds=600)
    # Send password recovery email via Resend
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h2 style="color: #6366f1; text-align: center;">Konvo Password Reset Request</h2>
        <p>A password reset request was initiated for your account. Please use the recovery code below to update your password:</p>
        <div style="background-color: #f4f4f5; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; padding: 15px; margin: 20px 0; border-radius: 4px; border: 1px solid #e4e4e7;">
            {recovery_code}
        </div>
        <p>This code will expire in 10 minutes. If you did not request this, you can ignore this email.</p>
    </div>
    """
    resend_client.send_email(request.email, "Konvo Password Recovery Code", html_content)
    
    print(f"\n[PASSWORD SYSTEM] Password recovery code generated for {request.email}: {recovery_code}\n")
    return {"success": True, "message": "A password recovery code has been sent to your email address."}

@app.post("/api/auth/reset-password")
def reset_password(request: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    redis_key = f"recovery:{request.email}"
    stored_code = redis_client.get_val(redis_key)
    
    if not stored_code or stored_code != request.code:
        raise HTTPException(status_code=400, detail="Invalid or expired recovery code.")
        
    user = crud.get_user_by_email(db, email=request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Update password hash
    user.password_hash = crud.ph.hash(request.new_password)
    db.commit()
    
    # Invalidate recovery code
    redis_client.set_val(redis_key, "", ex_seconds=1)
    
    return {"success": True, "message": "Password reset successfully."}
