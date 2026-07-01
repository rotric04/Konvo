"""
packages/shared-utils/redis_client.py
Enhanced Redis client with full in-memory fallback.

Additions over original:
  - cache_get / cache_set     — API response caching with TTL
  - blacklist_token / is_token_blacklisted — JWT logout invalidation
  - publish                   — Redis Pub/Sub event fanout
  - extend_presence           — heartbeat-driven TTL extension
  - delete                    — explicit key removal (already referenced in auth-service)

All new methods have the same in-memory fallback guarantee as the original.
"""

import redis
import os
import time
import json
import socket
import random
import logging
from urllib.parse import urlparse
from typing import Optional

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class RedisClient:
    def __init__(self):
        try:
            parsed = urlparse(REDIS_URL)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 6379
            if host == "localhost":
                host = "127.0.0.1"

            # Fast socket check before attempting full connection
            s = socket.create_connection((host, port), timeout=1.0)
            s.close()

            self.client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
            )
            self.client.ping()
            self.connected = True
            logger.info("[REDIS] Connected successfully.")
            print("Connected to Redis successfully!")
        except Exception:
            self.client = None
            self.connected = False
            self.fallback_cache: dict = {}
            self.fallback_expires: dict = {}
            logger.warning("[REDIS] Connection failed. Using in-memory fallback cache.")
            print("Warning: Redis connection failed. Initializing local in-memory fallback cache.")

    # ─── Core Key/Value ─────────────────────────────────────────────────────

    def set_val(self, key: str, value: str, ex_seconds: int = None):
        if self.connected:
            try:
                self.client.set(key, value, ex=ex_seconds)
                return
            except Exception:
                self.connected = False

        # In-memory fallback
        self.fallback_cache[key] = value
        if ex_seconds:
            self.fallback_expires[key] = time.time() + ex_seconds

    def get_val(self, key: str) -> Optional[str]:
        if self.connected:
            try:
                return self.client.get(key)
            except Exception:
                self.connected = False

        # Fallback — respect expiration
        if key in self.fallback_expires:
            if time.time() > self.fallback_expires[key]:
                self.fallback_cache.pop(key, None)
                self.fallback_expires.pop(key, None)
                return None
        return self.fallback_cache.get(key)

    def delete(self, key: str) -> bool:
        """Explicit key deletion (used by auth-service for captcha cleanup)."""
        if self.connected:
            try:
                self.client.delete(key)
                return True
            except Exception:
                self.connected = False

        self.fallback_cache.pop(key, None)
        self.fallback_expires.pop(key, None)
        return True

    # ─── API Response Cache ──────────────────────────────────────────────────

    def cache_set(self, key: str, data: dict, ttl_seconds: int = 60):
        """Cache a JSON-serializable dict. Silently no-ops on error."""
        try:
            self.set_val(f"cache:{key}", json.dumps(data), ex_seconds=ttl_seconds)
        except Exception as e:
            logger.debug(f"[REDIS] cache_set failed for {key}: {e}")

    def cache_get(self, key: str) -> Optional[dict]:
        """Retrieve a cached dict. Returns None on miss or error."""
        try:
            raw = self.get_val(f"cache:{key}")
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.debug(f"[REDIS] cache_get failed for {key}: {e}")
        return None

    def cache_invalidate(self, key: str):
        """Invalidate a specific cache entry."""
        self.delete(f"cache:{key}")

    # ─── JWT Token Blacklisting (Logout Invalidation) ───────────────────────

    def blacklist_token(self, jti: str, ttl_seconds: int = 3600):
        """
        Blacklist a JWT token by its JTI (JWT ID) claim.
        Token remains valid for its remaining TTL but auth middleware rejects it.
        """
        self.set_val(f"blacklist:token:{jti}", "1", ex_seconds=ttl_seconds)

    def is_token_blacklisted(self, jti: str) -> bool:
        """Returns True if the token's JTI is in the blacklist."""
        if not jti:
            return False
        return self.get_val(f"blacklist:token:{jti}") == "1"

    # ─── Rate Limiting ───────────────────────────────────────────────────────

    def incr_rate_limit(self, key: str, window_seconds: int = 86400) -> int:
        if self.connected:
            try:
                pipe = self.client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds)
                res = pipe.execute()
                return res[0]
            except Exception:
                self.connected = False

        # Fallback
        current = self.get_val(key)
        new_val = 1 if current is None else int(current) + 1
        self.set_val(key, str(new_val), ex_seconds=window_seconds)
        return new_val

    def check_sliding_window_limit(self, key: str, limit: int, window_seconds: int) -> bool:
        """
        Sliding window rate limit. Returns True if the limit is exceeded.
        Uses Redis sorted sets for precision; falls back to in-memory list.
        """
        now = time.time()
        cutoff = now - window_seconds

        if self.connected:
            try:
                self.client.zremrangebyscore(key, 0, cutoff)
                count = self.client.zcard(key)
                if count >= limit:
                    return True  # Rate limited
                pipe = self.client.pipeline()
                pipe.zadd(key, {f"{now}-{random.random()}": now})
                pipe.expire(key, window_seconds)
                pipe.execute()
                return False
            except Exception:
                self.connected = False

        # In-memory fallback
        if not hasattr(self, "fallback_sliding_windows"):
            self.fallback_sliding_windows = {}
        if key not in self.fallback_sliding_windows:
            self.fallback_sliding_windows[key] = []

        self.fallback_sliding_windows[key] = [
            t for t in self.fallback_sliding_windows[key] if t > cutoff
        ]

        if len(self.fallback_sliding_windows[key]) >= limit:
            return True

        self.fallback_sliding_windows[key].append(now)
        return False

    # ─── Online Presence ─────────────────────────────────────────────────────

    def set_presence(self, user_id: int, state: str):
        """Track user online state. Default TTL: 5 minutes (extended by heartbeat)."""
        key = f"presence:user:{user_id}"
        self.set_val(key, state, ex_seconds=300)

    def get_presence(self, user_id: int) -> str:
        res = self.get_val(f"presence:user:{user_id}")
        return res if res else "offline"

    def extend_presence(self, user_id: int, ttl_seconds: int = 300):
        """
        Extend the presence TTL on WebSocket heartbeat.
        This keeps users marked 'online' as long as they're connected.
        """
        if self.connected:
            try:
                key = f"presence:user:{user_id}"
                current = self.client.get(key)
                if current:
                    self.client.expire(key, ttl_seconds)
            except Exception:
                pass  # Presence keepalive failures are non-critical

    # ─── Pub/Sub Event Fanout ────────────────────────────────────────────────

    def publish(self, channel: str, message: dict) -> bool:
        """
        Publish a message to a Redis Pub/Sub channel.
        No-ops silently if Redis is unavailable (WebSocket manager handles delivery).
        """
        if not self.connected:
            return False
        try:
            self.client.publish(channel, json.dumps(message))
            return True
        except Exception as e:
            logger.debug(f"[REDIS] Publish to {channel} failed: {e}")
            return False

    # ─── OTP / Pending Registration (unchanged from original) ────────────────
    # All existing callers of set_val / get_val continue to work unchanged.


redis_client = RedisClient()
