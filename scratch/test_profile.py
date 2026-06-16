import sys
import os

# Traverse up to locate root monorepo path
_curr = os.path.abspath(__file__)
_root = None
while _curr:
    _parent = os.path.dirname(_curr)
    if os.path.exists(os.path.join(_curr, "services")) and os.path.exists(os.path.join(_curr, "packages")):
        _root = _curr
        break
    if _parent == _curr:
        _root = os.getcwd()
        break
    _curr = _parent

sys.path.insert(0, _root)
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from fastapi.testclient import TestClient
from gateway import app
from database import get_db, SessionLocal
import models
import schemas
import crud

client = TestClient(app)

# 1. Create a test user in DB if not exists
db = SessionLocal()
test_email = "test_profile_500@example.com"
user = db.query(models.User).filter(models.User.email == test_email).first()
if not user:
    reg_schema = schemas.UserRegister(
        email=test_email,
        password="testpassword123",
        display_name="Test Profile 500",
        username="testprofile500",
        phone="+919999999999",
        interests=["Coding", "Tech"],
        goals=["Learn"]
    )
    user = crud.create_user(db, reg_schema)
    user.otp_verified = True
    db.commit()

# Mock authenticate current user
from auth_helper import get_current_user
app.dependency_overrides[get_current_user] = lambda: user

# Try to call PUT /api/users/profile
try:
    response = client.put("/api/users/profile", json={
        "display_name": "Updated Name",
        "bio": "An updated bio that is long enough.",
        "gender": "Male",
        "looking_for_gender": "Female",
        "birth_date": "1995-12-15",
        "birth_time": "14:30:00",
        "birth_location": "Delhi, India",
        "digipin": None,
        "interests": ["Coding", "Tech"],
        "goals": ["Learn"],
        "relationship_intent": "Friendship"
    })
    print("STATUS CODE:", response.status_code)
    print("RESPONSE:", response.text)
except Exception as e:
    import traceback
    print("EXCEPTION:", str(e))
    traceback.print_exc()
finally:
    app.dependency_overrides.clear()
    db.close()
