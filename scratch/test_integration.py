import httpx
import sys

def run_integration_test():
    base_url = "http://localhost:8000"
    print("Testing Registration...")
    
    # Generate random email/username to avoid unique constraint conflicts
    import random
    rand_id = random.randint(1000, 9999)
    email = f"test_developer_{rand_id}@konvo.app"
    username = f"dev_user_{rand_id}"
    
    register_payload = {
        "email": email,
        "username": username,
        "password": "Password123!",
        "display_name": "Integration Tester",
        "phone": f"+1555010{rand_id}",
        "gender": "Male",
        "relationship_intent": "Friendship",
        "interests": ["programming", "ai"],
        "goals": ["Verify integration flows"],
        "birth_date": "1995-05-15",
        "birth_time": "08:30:00",
        "birth_location": "New York, NY",
        "digipin": "GP-110001",
        "turnstile_token": "mock_token"
    }
    
    # 1. Register
    resp = httpx.post(f"{base_url}/api/auth/register", json=register_payload)
    if resp.status_code != 200:
        print(f"Registration failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
        
    print("Registration succeeded!")
    reg_data = resp.json()
    
    # 2. Get OTP from DB (since we are testing locally and have access to SQLite/PostgreSQL)
    print("Fetching OTP from database...")
    from database import SessionLocal
    import models
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Check pending registration in redis fallback or database
        # Since it's in Redis and we might be falling back to in-memory:
        # Let's check redis client fallback directly
        from redis_client import redis_client
        import json
        pending_str = redis_client.get_val(f"pending_reg:{email}")
        if pending_str:
            pending_data = json.loads(pending_str)
            otp = pending_data.get("otp_code")
        else:
            print("Failed to find user or pending registration")
            sys.exit(1)
    else:
        otp = user.otp_code
    db.close()
    
    print(f"Retrieved OTP code: {otp}")
    
    # 3. Verify OTP
    verify_payload = {
        "email": email,
        "otp_code": otp
    }
    resp = httpx.post(f"{base_url}/api/auth/verify-otp", json=verify_payload)
    if resp.status_code != 200:
        print(f"OTP Verification failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("OTP Verified successfully!")
    
    # 4. Login
    login_payload = {
        "email": email,
        "password": "Password123!",
        "turnstile_token": "mock_token"
    }
    resp = httpx.post(f"{base_url}/api/auth/login", json=login_payload)
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
    print("Logged in successfully!")
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 5. Query AI diagnostics
    print("Querying AI Diagnostics...")
    resp = httpx.get(f"{base_url}/api/ai-diagnostics", headers=headers)
    if resp.status_code != 200:
        print(f"AI Diagnostics failed: {resp.status_code} - {resp.text}")
        sys.exit(1)
        
    diag = resp.json()
    print("AI Diagnostics Result:")
    print(f"Gemini: {diag['gemini']}")
    print(f"Replicate: {diag['replicate']}")
    print(f"FAL: {diag['fal']}")
    
    print("Integration test passed successfully!")

if __name__ == "__main__":
    run_integration_test()
