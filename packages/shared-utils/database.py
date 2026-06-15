from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
import socket
from urllib.parse import urlparse

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://konvo_user:konvo_password@localhost:5432/konvodb")
FALLBACK_DATABASE_URL = "sqlite:///./konvodb.db"

# Try connecting to the primary database, fallback to SQLite if it fails
try:
    print("DB Debug: parsed url...")
    parsed = urlparse(DATABASE_URL)
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 5432
    print(f"DB Debug: host={host}, port={port}")
    if host == "localhost":
        host = "127.0.0.1"
        # Rewrite URL to use IP to bypass driver-level hostname resolution hangs
        if "@localhost" in DATABASE_URL:
            DATABASE_URL = DATABASE_URL.replace("@localhost", "@127.0.0.1")
        print(f"DB Debug: rewritten URL={DATABASE_URL}")
        
    if "postgresql" in DATABASE_URL:
        print("DB Debug: pre-checking socket connection...")
        # Pre-check port with 1-second timeout
        s = socket.create_connection((host, port), timeout=1.0)
        s.close()
        print("DB Debug: socket connection succeeded!")
        
    print("DB Debug: creating engine...")
    connect_args = {"connect_args": {"connect_timeout": 2}} if "postgresql" in DATABASE_URL else {}
    engine = create_engine(DATABASE_URL, **connect_args)
    # Test connection
    print("DB Debug: connecting engine...")
    conn = engine.connect()
    print("DB Debug: closing connection...")
    conn.close()
    print("DB Debug: finished try block successfully!")
except Exception as e:
    print(f"Warning: Primary database connection failed ({e}). Falling back to local SQLite database.")
    DATABASE_URL = FALLBACK_DATABASE_URL
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
