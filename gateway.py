import os
import sys
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Resolve project root
_root = os.path.dirname(os.path.abspath(__file__))

# Inject package paths to load database, models, schemas, and algorithms
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from redis_client import redis_client
from database import Base, engine, get_db
from sqlalchemy.orm import Session
import models
import base64
import json
from hashlib import sha256
from fastapi import Depends
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# ─── Observability & Hardening ──────────────────────────────
# 1. Sentry Init
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1
    )
    print("[GATEWAY] Sentry logging initialized.")

# Create tables in SQLite/Postgres
Base.metadata.create_all(bind=engine)

# Initialize master FastAPI app
app = FastAPI(
    title="GATEWAY™ — Production-Grade Hub",
    description="Unified API gateway mounting all microservices with full observability.",
    version="1.0.0",
    debug=True
)


# 2. slowapi Rate Limiter Init
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import socket
from urllib.parse import urlparse

# Probe Redis to prevent uncaught slowapi connection crashes
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
storage_uri = "memory://"
try:
    parsed = urlparse(redis_url)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 6379
    if host == "localhost":
        host = "127.0.0.1"
    # Try a quick socket connection
    s = socket.create_connection((host, port), timeout=0.5)
    s.close()
    storage_uri = redis_url
    print(f"[GATEWAY] Rate limiter connected to Redis at {host}:{port}")
except Exception:
    print("[GATEWAY] WARNING: Redis is not reachable. Limiter falling back to memory:// storage.")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=storage_uri,
    default_limits=["120/minute"]
)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore


# 3. Prometheus Metrics Instrumentation
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
print("[GATEWAY] Prometheus metrics instrumentation active.")

# Rate limiting rules configuration
RATE_LIMIT_RULES = {
    "/api/auth/login": (10, 60),
    "/api/auth/register": (5, 60),
    "/api/auth/verify-otp": (10, 60),
    "/api/compatibility/swipe": (100, 60),
    "/api/chat/messages": (120, 60),
    "/api/agents/twin": (30, 60),
    "/api/search": (60, 60),
}

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' *; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com blob:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: https://unpkg.com https://*.tile.openstreetmap.org http://*.basemaps.cartocdn.com https://*.basemaps.cartocdn.com http://basemaps.cartocdn.com https://basemaps.cartocdn.com; "
            "connect-src 'self' ws: wss: https://unpkg.com https://*.tile.openstreetmap.org http://*.basemaps.cartocdn.com https://*.basemaps.cartocdn.com http://basemaps.cartocdn.com https://basemaps.cartocdn.com; "
            "worker-src 'self' blob:; "
            "child-src 'self' blob:; "
            "frame-ancestors 'none';"
        )
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Apply CORS middleware to avoid cross-origin constraints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- SERVICE ROUTE INCLUSION -----------------
# Instead of mount() + ASGI middleware (which breaks on hot-reload),
# we load each service module and include their routes directly.

import importlib.util
from fastapi.routing import APIRoute, APIWebSocketRoute
from starlette.routing import WebSocketRoute

def include_service_routes(gateway_app: FastAPI, service_dir_name: str):
    """Load a service module and copy all its API routes into the gateway app."""
    service_path = os.path.join(_root, "services", service_dir_name, "main.py")
    module_name = f"{service_dir_name.replace('-', '_')}_main"
    service_dir = os.path.dirname(service_path)

    sys.path.insert(0, service_dir)
    try:
        spec = importlib.util.spec_from_file_location(module_name, service_path)
        if spec is None or spec.loader is None:
            print(f"[GATEWAY] WARNING: Could not load spec for {service_dir_name}")
            return None
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        service_app = getattr(module, "app")

        # Copy every non-meta route from the service into the gateway
        for route in service_app.routes:
            if isinstance(route, APIRoute):
                # Avoid duplicates
                existing_paths = [r.path for r in gateway_app.routes if hasattr(r, 'path')]
                if route.path not in existing_paths:
                    gateway_app.add_api_route(
                        path=route.path,
                        endpoint=route.endpoint,
                        methods=list(route.methods or ["GET"]),
                        response_model=route.response_model,
                        tags=route.tags,
                        summary=route.summary,
                        description=route.description,
                        dependencies=route.dependencies,
                        include_in_schema=True
                    )
            elif isinstance(route, APIWebSocketRoute) or isinstance(route, WebSocketRoute):
                existing_ws = [r.path for r in gateway_app.routes if hasattr(r, 'path')]
                if route.path not in existing_ws:
                    gateway_app.add_api_websocket_route(
                        path=route.path,
                        endpoint=route.endpoint
                    )
        print(f"[GATEWAY] Loaded service: {service_dir_name}")
        return module
    except Exception as e:
        print(f"[GATEWAY] ERROR loading {service_dir_name}: {e}")
        return None
    finally:
        if service_dir in sys.path:
            sys.path.remove(service_dir)

# Include all microservice routes directly into the gateway
include_service_routes(app, "auth-service")
include_service_routes(app, "community-service")
include_service_routes(app, "user-service")
include_service_routes(app, "behavior-engine")
include_service_routes(app, "sentiment-engine")
include_service_routes(app, "ai-agent-service")
include_service_routes(app, "messaging-service")
include_service_routes(app, "graph-service")
include_service_routes(app, "search-service")
include_service_routes(app, "feedback-service")


# ----------------- HEALTH CHECK ENDPOINT -----------------
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    from sqlalchemy import text
    health_status = {
        "status": "healthy",
        "database": "disconnected",
        "redis": "disconnected",
        "env": os.getenv("ENV", "development")
    }
    
    # 1. Test Supabase Database connection
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["database_error"] = str(e)
        
    # 2. Test Redis connection
    if redis_client.connected:
        health_status["redis"] = "connected"
    else:
        health_status["status"] = "unhealthy"
        health_status["redis_error"] = "Redis client not connected (using local in-memory fallback cache)"
        
    return health_status


# ----------------- STATIC FRONTEND PAGES -----------------

# Mount static directory to the Vanilla web directory
app.mount("/static", StaticFiles(directory=os.path.join(_root, "frontend")), name="static")

@app.get("/")
def get_index_html():
    return FileResponse(os.path.join(_root, "frontend", "index.html"))

@app.get("/auth")
@app.get("/login")
def get_auth_html():
    return FileResponse(os.path.join(_root, "frontend", "login.html"))

@app.get("/onboarding")
def get_onboarding_html():
    return FileResponse(os.path.join(_root, "frontend", "onboarding.html"))

@app.get("/discover")
@app.get("/chat")
@app.get("/grid")
@app.get("/profile")
@app.get("/settings")
@app.get("/agents")
@app.get("/compatibility")
@app.get("/communities")
@app.get("/graph")
@app.get("/virtual-dates")
def get_app_html():
    return FileResponse(os.path.join(_root, "frontend", "app.html"))

@app.get("/feedback")
def get_feedback_html():
    return FileResponse(os.path.join(_root, "frontend", "feedback.html"))

@app.get("/blog")
@app.get("/blog/{post_id}")
def get_blog_html():
    return FileResponse(os.path.join(_root, "frontend", "blog.html"))

# ----------------- SEO & SECURITY SPECIFICATIONS -----------------

@app.get("/robots.txt")
def get_robots_txt():
    return FileResponse(os.path.join(_root, "frontend", "robots.txt"), media_type="text/plain")

@app.get("/sitemap.xml")
def get_sitemap_xml():
    return FileResponse(os.path.join(_root, "frontend", "sitemap.xml"), media_type="application/xml")

@app.get("/.well-known/security.txt")
@app.get("/security.txt")
def get_security_txt():
    return FileResponse(os.path.join(_root, "frontend", "security.txt"), media_type="text/plain")

@app.get("/pgp-key.txt")
def get_pgp_key_txt():
    return FileResponse(os.path.join(_root, "frontend", "pgp-key.txt"), media_type="text/plain")

@app.get("/hall-of-fame")
def get_hall_of_fame_html():
    return FileResponse(os.path.join(_root, "frontend", "hall-of-fame.html"))

@app.get("/security-policy")
def get_security_policy_html():
    return FileResponse(os.path.join(_root, "frontend", "security-policy.html"))

@app.get("/llms.txt")
def get_llms_txt():
    return FileResponse(os.path.join(_root, "frontend", "llms.txt"), media_type="text/plain")

@app.get("/llm-full.txt")
@app.get("/llms-full.txt")
def get_llms_full_txt():
    return FileResponse(os.path.join(_root, "frontend", "llm-full.txt"), media_type="text/plain")


# ----------------- SECURE ENCRYPTED ADMIN DATA ROUTING -----------------

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

@app.get("/" + os.getenv("ADMIN_ROUTE_PATH", "admin-portal-secured"))
def get_admin_dashboard():
    return FileResponse(os.path.join(_root, "frontend", "admin_dashboard.html"))


from pydantic import BaseModel

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
    import crud
    import schemas
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


# ----------------- ROOT-LEVEL STATIC FILE SERVING FALLBACK -----------------
# This serves root-level static assets (e.g. /src/app.js, /style.css) locally.
# It MUST be mounted at the very end to prevent intercepting other API/HTML routes.
app.mount("/", StaticFiles(directory=os.path.join(_root, "frontend")), name="root_static")


if __name__ == "__main__":
    print("\n-----------------------------------------------------------")
    print("Initializing KONVO™ local gateway server on http://localhost:8000")
    print("All microservices and static web layouts are active!")
    print("-----------------------------------------------------------\n")
    uvicorn.run("gateway:app", host="0.0.0.0", port=8000, reload=True)
