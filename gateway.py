import os
import sys
import uvicorn
import ipaddress
import random
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Resolve project root
_root = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env file
load_dotenv(os.path.join(_root, ".env"))

# Inject package paths to load database, models, schemas, and algorithms
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from redis_client import redis_client
from database import Base, engine, get_db, apply_db_migrations
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
        traces_sample_rate=0.2,
        environment=os.getenv("ENV", "development"),
        release=os.getenv("APP_VERSION", "1.0.0"),
        send_default_pii=False,  # GDPR: no PII in error reports
    )
    print("[GATEWAY] Sentry error monitoring initialized.")

from websocket_manager import manager

# Create tables in SQLite/Postgres
Base.metadata.create_all(bind=engine)
apply_db_migrations(engine)


# Initialize master FastAPI app
app = FastAPI(
    title="GATEWAY™ — Production-Grade Hub",
    description="Unified API gateway mounting all microservices with full observability.",
    version="1.0.0",
    debug=True
)

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket, channel: str = "global"):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await manager.broadcast(message, channel)
            except Exception as e:
                print(f"[WS ERROR] Failed to broadcast message on channel {channel}: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

@app.post("/api/realtime/presence")
async def handle_presence_update(update: dict):
    user_id = update.get("user_id")
    status = update.get("status")
    if user_id is None or status is None:
        raise HTTPException(status_code=400, detail="Invalid presence update payload")
    
    message = {"type": "presence_update", "user_id": user_id, "status": status}
    await manager.broadcast(message, "presence_updates")
    return {"success": True}

@app.post("/api/realtime/notification")
async def handle_notification(notification: dict):
    user_id = notification.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=400, detail="Invalid notification payload")
    
    message = {"type": "new_notification", "notification": notification}
    await manager.broadcast(message, f"user_notifications_{user_id}")
    return {"success": True}

# 2. Custom Sliding Window Rate Limiting Setup
RATE_LIMIT_RULES = {
    "/api/auth/login": (5, 60),
    "/api/auth/login-form": (5, 60),
    "/api/auth/register": (3, 60),
    "/api/auth/forgot-password": (2, 60),
    "/api/auth/reset-password": (2, 60),
    "/api/auth/verify-otp": (10, 60),
    "/api/compatibility/swipe": (100, 60),
    "/api/chat/messages": (120, 60),
    "/api/agents/twin": (30, 60),
    "/api/search": (60, 60),
}
class SlidingWindowRateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api") and not request.url.path.startswith("/api/health"):
            ip = request.client.host if request.client else "127.0.0.1"
            rule = None
            for path_prefix, (limit, window) in RATE_LIMIT_RULES.items():
                if request.url.path == path_prefix or request.url.path.startswith(path_prefix + "/"):
                    rule = (limit, window)
                    break
            
            if rule is None:
                # Default limit of 120 requests per minute
                rule = (120, 60)
                
            limit, window = rule
            clean_path = request.url.path.rstrip("/").replace("/", "_")
            key = f"rate_limit:{ip}:{clean_path}"
            
            if redis_client.check_sliding_window_limit(key, limit, window):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Please try again later."}
                )
        
        return await call_next(request)

app.add_middleware(SlidingWindowRateLimitMiddleware)


# 3. Prometheus Metrics Instrumentation
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
print("[GATEWAY] Prometheus metrics instrumentation active.")


CLOUDFLARE_IPV4_RANGES = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22"
]
CLOUDFLARE_IPV6_RANGES = [
    "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
    "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32"
]

def is_ip_in_ranges(ip_str: str, ranges: list) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        for r in ranges:
            if ip in ipaddress.ip_network(r):
                return True
    except Exception:
        pass
    return False

def is_request_from_cloudflare(request: Request) -> bool:
    # 1. Trust if request is proxied via Vercel (frontend deployment)
    if request.headers.get("x-vercel-id") or request.headers.get("X-Vercel-Id"):
        return True

    # 2. Check if client IP is from Cloudflare edge IP ranges
    # Try getting the last proxy IP from X-Forwarded-For first (useful when running behind Render/reverse proxy)
    x_forwarded_for = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        ips = [ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()]
        if ips:
            client_ip = ips[-1]
            if is_ip_in_ranges(client_ip, CLOUDFLARE_IPV4_RANGES) or is_ip_in_ranges(client_ip, CLOUDFLARE_IPV6_RANGES):
                return True

    # Fallback to direct client host (e.g. for local tests or direct connections)
    client_ip = request.client.host if request.client else None
    if not client_ip:
        return False
    if is_ip_in_ranges(client_ip, CLOUDFLARE_IPV4_RANGES) or is_ip_in_ranges(client_ip, CLOUDFLARE_IPV6_RANGES):
        return True
    return False

class CloudflareBotProtectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        env = os.getenv("ENV", "development")
        
        # Determine client connecting IP
        connecting_ip = request.headers.get("CF-Connecting-IP")
        if not connecting_ip:
            connecting_ip = request.client.host if request.client else "127.0.0.1"

        # Local development bypass: bypass Cloudflare IP/header check on localhost or in dev mode
        is_local = (connecting_ip in ["127.0.0.1", "::1", "localhost"]) or (env == "development")
        
        # 1. Block direct origin IP access in production
        if not is_local:
            # Check Cloudflare headers are present.
            # CF-Ray, CF-IPCountry, and CF-Connecting-IP are injected exclusively by
            # Cloudflare at the edge and cannot be spoofed. Their presence is sufficient
            # proof that the request was routed through Cloudflare.
            # NOTE: We do NOT check client IP ranges here because on Render (and similar
            # PaaS platforms), request.client.host is always the internal load balancer IP,
            # not the Cloudflare edge IP, so IP range checks always fail in production.
            cf_ipcountry = request.headers.get("CF-IPCountry")
            cf_ray = request.headers.get("CF-Ray")
            cf_connecting_ip = request.headers.get("CF-Connecting-IP")

            if not cf_ipcountry or not cf_ray or not cf_connecting_ip:
                print(f"[CLOUDFLARE PROTECTION] Blocked request from ip={connecting_ip} path={path} - Missing CF headers")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Direct access to origin server IP is forbidden. Requests must pass through Cloudflare."}
                )

            print(f"[CLOUDFLARE PROTECTION] CF headers verified for ip={connecting_ip} path={path} ray={cf_ray}")

        # 2. Skip checks for non-GET requests, API endpoints, WebSockets, static folders/extensions
        is_page_request = True
        
        # Skip non-GET
        if request.method != "GET":
            is_page_request = False
            
        # Skip API/WS/Static
        if path.startswith("/api/") or path.startswith("/ws/") or path.startswith("/static/"):
            is_page_request = False
            
        # Skip assets by extension
        _, ext = os.path.splitext(path)
        if ext and ext.lower() not in [".html", ".htm"]:
            is_page_request = False
            
        # Skip specific root level static files
        skip_files = {
            "/favicon.ico", "/favicon.png", "/favicon.svg", "/og_banner.png",
            "/logo_dark.svg", "/logo_light.svg", "/logo_app.svg", "/logo_loading.svg",
            "/theme.css", "/style.css", "/sw.js", "/robots.txt", "/sitemap.xml",
            "/security.txt", "/agents.json", "/pgp-key.txt", "/llms.txt", "/llms-full.txt"
        }
        if path in skip_files:
            is_page_request = False
            
        # If it is a page request, verify the cf_clearance HttpOnly cookie
        if is_page_request:
            if request.cookies.get("cf_clearance") == "true":
                print(f"[CLOUDFLARE PROTECTION] Verified human request to path={path} ip={connecting_ip}")
                return await call_next(request)
            
            # Serve the Managed Challenge
            print(f"[CLOUDFLARE PROTECTION] Challenge served for path={path} ip={connecting_ip}")
            return FileResponse(os.path.join(_root, "frontend", "security-verification.html"))

        # Otherwise, proceed
        response = await call_next(request)
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self' *; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' "
            "https://unpkg.com https://cdnjs.cloudflare.com "
            "https://static.cloudflareinsights.com https://challenges.cloudflare.com "
            "https://cdn.jsdelivr.net https://js.sentry-cdn.com "
            "https://browser.sentry-cdn.com https://assets.sentry-cdn.com blob:; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com "
            "https://unpkg.com https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob: "
            "https://unpkg.com https://*.tile.openstreetmap.org "
            "http://*.basemaps.cartocdn.com https://*.basemaps.cartocdn.com "
            "http://basemaps.cartocdn.com https://basemaps.cartocdn.com "
            "https://res.cloudinary.com; "
            "connect-src 'self' ws: wss: "
            "https://formsubmit.co https://unpkg.com "
            "https://konvo-u5qb.onrender.com "
            "https://nominatim.openstreetmap.org "
            "https://challenges.cloudflare.com "
            "https://*.tile.openstreetmap.org "
            "http://*.basemaps.cartocdn.com https://*.basemaps.cartocdn.com "
            "http://basemaps.cartocdn.com https://basemaps.cartocdn.com "
            "https://app.posthog.com https://eu.posthog.com "
            "https://*.ingest.sentry.io https://sentry.io; "
            "frame-src 'self' https://challenges.cloudflare.com; "
            "worker-src 'self' blob:; "
            "child-src 'self' blob: https://challenges.cloudflare.com; "
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


app.add_middleware(CloudflareBotProtectionMiddleware)
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
                # Avoid duplicate path + method combinations
                duplicate = False
                for r in gateway_app.routes:
                    if isinstance(r, APIRoute) and r.path == route.path:
                        r_methods = set(r.methods or ["GET"])
                        route_methods = set(route.methods or ["GET"])
                        if r_methods & route_methods:
                            duplicate = True
                            break
                if not duplicate:
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
            elif isinstance(route, (APIWebSocketRoute, WebSocketRoute)):
                # Avoid duplicate WebSocket routes
                duplicate = False
                for r in gateway_app.routes:
                    if isinstance(r, (APIWebSocketRoute, WebSocketRoute)) and r.path == route.path:
                        duplicate = True
                        break
                if not duplicate:
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



@app.get("/api/auth/turnstile-config")
def gateway_turnstile_config():
    """
    Generate and store the fallback math captcha challenge in the GATEWAY's own
    redis_client. This must live in gateway.py (not auth-service) so that the
    challenge answer is stored in the same Redis/in-memory instance that
    verify-gate-captcha reads from — avoiding cross-service cache mismatches
    when Redis is unavailable and each service falls back to its own in-memory dict.
    """
    import uuid as _uuid
    site_key = os.getenv("TURNSTILE_SITE_KEY", "0x4AAAAAADg9vHwYwA4a699m")

    num1 = random.randint(1, 10)
    num2 = random.randint(1, 10)
    op = random.choice(["+", "-"])
    if op == "+":
        ans = num1 + num2
    else:
        if num1 < num2:
            num1, num2 = num2, num1
        ans = num1 - num2

    challenge_id = str(_uuid.uuid4())
    question = f"What is {num1} {op} {num2}?"

    try:
        redis_client.set_val(f"captcha:{challenge_id}", str(ans), ex_seconds=300)
    except Exception as e:
        print(f"[CAPTCHA FALLBACK] Error storing challenge in gateway redis_client: {e}")

    return {
        "site_key": site_key,
        "fallback_challenge": {
            "id": challenge_id,
            "question": question
        }
    }


@app.post("/api/auth/verify-gate-captcha")

async def verify_gate_captcha(request: Request):
    try:
        data = await request.json()
        token = data.get("token")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request payload")
        
    if not token:
        raise HTTPException(status_code=400, detail="Challenge token missing")
        
    # Check for manual math fallback verification
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
                        response = JSONResponse(content={"success": True})
                        response.set_cookie(
                            key="cf_clearance",
                            value="true",
                            httponly=False,
                            samesite="lax",
                            secure=True,
                            max_age=86400  # 1 day
                        )
                        return response
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Manual verification challenge failed")

    # Cloudflare Turnstile token validation
    secret = os.getenv("TURNSTILE_SECRET_KEY", "0x4AAAAAADg9vNjq6QZQOJcUD1RPMaznmhc")
    if token in ["dummy-token", "1x00000000000000000000AA"]:
        response = JSONResponse(content={"success": True})
        response.set_cookie(
            key="cf_clearance",
            value="true",
            httponly=False,
            samesite="lax",
            secure=False,
            max_age=86400
        )
        return response

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": secret,
                    "response": token,
                    "remoteip": request.client.host if request.client else None
                },
                timeout=5.0
            )
            if resp.status_code == 200 and resp.json().get("success", False):
                response = JSONResponse(content={"success": True})
                response.set_cookie(
                    key="cf_clearance",
                    value="true",
                    httponly=False,
                    samesite="lax",
                    secure=True,
                    max_age=86400  # 1 day clearance
                )
                print(f"[CLOUDFLARE PROTECTION] Human verified successfully with Turnstile token: {token[:12]}...")
                return response
    except Exception as e:
        print(f"[CLOUDFLARE PROTECTION] Turnstile siteverify exception: {e}")
        
    raise HTTPException(status_code=400, detail="CAPTCHA verification failed. Please try again.")


# ----------------- HEALTH CHECK ENDPOINT -----------------
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    from sqlalchemy import text
    health_status = {
        "status": "healthy",
        "database": "disconnected",
        "redis": "disconnected",
        "typesense": "disabled",
        "cloudinary": "disabled",
        "perspective": "disabled",
        "env": os.getenv("ENV", "development")
    }

    # 1. Test database connection
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["database_error"] = str(e)

    # 2. Test Redis connection
    if redis_client.connected:
        health_status["redis"] = "connected"
    else:
        health_status["redis"] = "fallback"
        health_status["redis_note"] = "Using in-memory fallback cache"

    # 3. Test Typesense (optional)
    try:
        from typesense_client import typesense_client
        if typesense_client.enabled:
            health_status["typesense"] = "connected" if typesense_client.is_available() else "unreachable"
        else:
            health_status["typesense"] = "disabled (TYPESENSE_API_KEY not set)"
    except ImportError:
        health_status["typesense"] = "not installed"

    # 4. Check Cloudinary (optional)
    try:
        from cloudinary_client import is_available as cld_available
        health_status["cloudinary"] = "configured" if cld_available() else "disabled (credentials not set)"
    except ImportError:
        health_status["cloudinary"] = "not installed"

    # 5. Check Perspective API (optional)
    try:
        from perspective_client import is_available as persp_available
        health_status["perspective"] = "configured" if persp_available() else "disabled (API key not set)"
    except ImportError:
        health_status["perspective"] = "not installed"

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
    return FileResponse(os.path.join(_root, "frontend", "pages", "login.html"))

@app.get("/onboarding")
def get_onboarding_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "onboarding.html"))

@app.get("/privacy-policy")
def get_privacy_policy_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "privacy-policy.html"))

@app.get("/terms-of-service")
def get_terms_of_service_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "terms-of-service.html"))


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
@app.get("/diagnostics")
@app.get("/ai-diagnostics")
@app.get("/notifications")
def get_app_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "app.html"))

@app.get("/feedback")
def get_feedback_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "feedback.html"))

@app.get("/blog")
@app.get("/blog/{post_id}")
def get_blog_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "blog.html"))

# ----------------- SEO & SECURITY SPECIFICATIONS -----------------

@app.get("/robots.txt")
def get_robots_txt():
    return FileResponse(os.path.join(_root, "frontend", "txt", "robots.txt"), media_type="text/plain")

@app.get("/sitemap.xml")
def get_sitemap_xml():
    return FileResponse(os.path.join(_root, "frontend", "sitemap.xml"), media_type="application/xml")

@app.get("/.well-known/security.txt")
@app.get("/security.txt")
def get_security_txt():
    return FileResponse(os.path.join(_root, "frontend", "txt", "security.txt"), media_type="text/plain")

@app.get("/.well-known/agents.json")
@app.get("/agents.json")
def get_agents_json():
    return FileResponse(os.path.join(_root, "frontend", "txt", "agents.json"), media_type="application/json")

@app.get("/pgp-key.txt")
def get_pgp_key_txt():
    return FileResponse(os.path.join(_root, "frontend", "txt", "pgp-key.txt"), media_type="text/plain")

@app.get("/hall-of-fame")
def get_hall_of_fame_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "hall-of-fame.html"))

@app.get("/security-policy")
def get_security_policy_html():
    return FileResponse(os.path.join(_root, "frontend", "pages", "security-policy.html"))

@app.get("/llms.txt")
def get_llms_txt():
    return FileResponse(os.path.join(_root, "frontend", "txt", "llms.txt"), media_type="text/plain")

@app.get("/llm-full.txt")
@app.get("/llms-full.txt")
def get_llms_full_txt():
    return FileResponse(os.path.join(_root, "frontend", "txt", "llm-full.txt"), media_type="text/plain")


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
    return FileResponse(os.path.join(_root, "frontend", "pages", "admin_dashboard.html"))


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


# ----------------- CLEAN FRONTEND URL ROUTING -----------------
# These routes serve clean frontend URLs locally.
@app.get("/login")
@app.get("/auth")
@app.get("/signup")
def get_login_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "login.html"))

@app.get("/onboarding")
def get_onboarding_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "onboarding.html"))

@app.get("/feedback")
def get_feedback_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "feedback.html"))

@app.get("/hall-of-fame")
def get_hall_of_fame_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "hall-of-fame.html"))

@app.get("/blog")
def get_blog_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "blog.html"))

@app.get("/blog/{path:path}")
def get_blog_subpage(path: str):
    return FileResponse(os.path.join(_root, "frontend", "pages", "blog.html"))

@app.get("/privacy-policy")
def get_privacy_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "privacy-policy.html"))

@app.get("/security-policy")
def get_security_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "security-policy.html"))

@app.get("/terms-of-service")
def get_terms_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "terms-of-service.html"))

# SPA Routes
@app.get("/discover")
@app.get("/chat")
@app.get("/grid")
@app.get("/profile")
@app.get("/settings")
@app.get("/dashboard")
@app.get("/ai-diagnostics")
@app.get("/notifications")
@app.get("/compatibility")
@app.get("/communities")
@app.get("/graph")
@app.get("/virtual-dates")
@app.get("/agents")
def get_app_page():
    return FileResponse(os.path.join(_root, "frontend", "pages", "app.html"))


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
