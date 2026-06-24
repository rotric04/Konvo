import sys
import os
from unittest.mock import patch

# Traverse up to locate root monorepo path
_curr = os.path.abspath(__file__)
_root = None
while _curr:
    if os.path.exists(os.path.join(_curr, "services")) and os.path.exists(os.path.join(_curr, "packages")):
        _root = _curr
        break
    _parent = os.path.dirname(_curr)
    if _parent == _curr:
        _root = os.getcwd()
        break
    _curr = _parent

sys.path.insert(0, _root)
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from fastapi.testclient import TestClient
from gateway import app
from redis_client import redis_client

def test_rate_limits():
    client = TestClient(app)
    
    # Clear rate limit keys for this IP first in Redis
    ip = "127.0.0.1"
    key = f"rate_limit:{ip}:_api_auth_login"
    try:
        redis_client.delete(key)
    except Exception:
        pass
        
    # Send 5 requests -> OK
    for _ in range(5):
        response = client.post("/api/auth/login", json={"email": "test@test.com", "password": "password"})
        assert response.status_code != 429
        
    # 6th request -> 429 Too Many Requests
    response = client.post("/api/auth/login", json={"email": "test@test.com", "password": "password"})
    assert response.status_code == 429
    assert "Rate limit exceeded" in response.json()["detail"]

if __name__ == "__main__":
    test_rate_limits()
    print("All Cloudflare protection unit tests passed successfully!")
