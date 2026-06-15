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

from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from database import get_db, engine, Base
import schemas
import models
import crud
import auth_helper
from auth_helper import create_access_token, create_refresh_token, REFRESH_TOKEN_EXPIRE_MINUTES
from fastapi.security import OAuth2PasswordRequestForm
from redis_client import redis_client
from resend_client import resend_client
import random
import secrets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service", version="1.0.0")

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserRegister, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.post("/api/auth/verify-otp")
def verify_otp(request: schemas.OTPVerifyRequest, db: Session = Depends(get_db)):
    success = crud.verify_user_otp(db, email=request.email, otp_code=request.otp_code)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid verification code or email.")
    return {"success": True, "message": "Account successfully verified."}

@app.post("/api/auth/resend-otp")
def resend_otp(request: schemas.OTPResendRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=request.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    cooldown_key = f"cooldown:otp:{request.email}"
    cooldown = redis_client.get_val(cooldown_key)
    if cooldown:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Please wait 60 seconds before requesting a new OTP."
        )
        
    new_otp = str(secrets.randbelow(900000) + 100000)
    user.otp_code = new_otp
    db.commit()
    
    redis_client.set_val(cooldown_key, "1", ex_seconds=60)
    
    resend_client.send_otp_email(request.email, new_otp)
    print(f"\n[OTP SYSTEM] Verification code generated for {request.email}: {new_otp}\n")
    
    return {"success": True, "message": "Verification code resent successfully."}

@app.post("/api/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, response: Response, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, email=credentials.email)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    try:
        crud.ph.verify(user.password_hash, credentials.password)
    except Exception:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
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
