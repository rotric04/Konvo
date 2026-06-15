import redis
import os
import time
import socket
from urllib.parse import urlparse

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

class RedisClient:
    def __init__(self):
        try:
            parsed = urlparse(REDIS_URL)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 6379
            if host == "localhost":
                host = "127.0.0.1"
            
            # Fast socket check
            s = socket.create_connection((host, port), timeout=1.0)
            s.close()
            
            self.client = redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=1.0, socket_connect_timeout=1.0)
            self.client.ping()
            self.connected = True
            print("Connected to Redis successfully!")
        except Exception:
            self.client = None
            self.connected = False
            self.fallback_cache = {}
            self.fallback_expires = {}
            print("Warning: Redis connection failed. Initializing local in-memory fallback cache.")

    def set_val(self, key: str, value: str, ex_seconds: int = None):
        if self.connected:
            try:
                self.client.set(key, value, ex=ex_seconds)
                return
            except Exception:
                self.connected = False
        
        # Fallback
        self.fallback_cache[key] = value
        if ex_seconds:
            self.fallback_expires[key] = time.time() + ex_seconds

    def get_val(self, key: str) -> str:
        if self.connected:
            try:
                return self.client.get(key)
            except Exception:
                self.connected = False

        # Fallback expiration check
        if key in self.fallback_expires:
            if time.time() > self.fallback_expires[key]:
                del self.fallback_cache[key]
                del self.fallback_expires[key]
                return None
        return self.fallback_cache.get(key)

    def incr_rate_limit(self, key: str, window_seconds: int = 86400) -> int:
        if self.connected:
            try:
                # Atomically increment rate limits key
                pipe = self.client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds)
                res = pipe.execute()
                return res[0]
            except Exception:
                self.connected = False

        # Fallback rate limiting incrementer
        current = self.get_val(key)
        if current is None:
            new_val = 1
        else:
            new_val = int(current) + 1
        self.set_val(key, str(new_val), ex_seconds=window_seconds)
        return new_val

    def set_presence(self, user_id: int, state: str):
        key = f"presence:user:{user_id}"
        # Presences live for 5 minutes of inactivity
        self.set_val(key, state, ex_seconds=300)

    def get_presence(self, user_id: int) -> str:
        res = self.get_val(f"presence:user:{user_id}")
        return res if res else "offline"

redis_client = RedisClient()
