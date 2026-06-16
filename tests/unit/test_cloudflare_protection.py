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

def test_cloudflare_headers_and_ip_validation_production():
    # Force production env
    with patch.dict(os.environ, {"ENV": "production"}):
        client = TestClient(app)
        
        # 1. Missing CF headers (CF-Ray / CF-IPCountry) in production -> 403 Forbidden
        response = client.get("/", headers={
            "CF-Connecting-IP": "8.8.8.8"
        })
        assert response.status_code == 403
        assert "Direct access to origin server IP is forbidden" in response.json()["detail"]
        
        # 2. CF headers present but IP not from CF edge -> 403 Forbidden
        response = client.get("/", headers={
            "CF-IPCountry": "US",
            "CF-Ray": "1234567890abcdef",
            "CF-Connecting-IP": "8.8.8.8"
        })
        assert response.status_code == 403
        assert "Request did not originate from Cloudflare" in response.json()["detail"]

        # 3. CF headers present and IP from CF range -> Passes IP check successfully, returning index page
        with patch("gateway.is_request_from_cloudflare", return_value=True):
            response = client.get("/", headers={
                "CF-IPCountry": "US",
                "CF-Ray": "1234567890abcdef",
                "CF-Connecting-IP": "173.245.48.5"
            })
            assert response.status_code == 200
            assert "World's First AI Twin Matchmaker" in response.text

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
    print("Running Cloudflare protection tests...")
    test_cloudflare_headers_and_ip_validation_production()
    test_rate_limits()
    print("All Cloudflare protection unit tests passed successfully!")
