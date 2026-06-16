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

def apply_db_migrations(engine):
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    
    # Check if 'users' table columns need migration
    if 'users' in inspector.get_table_names():
        columns = [c['name'] for c in inspector.get_columns('users')]
        
        # Add 'username' if missing
        if 'username' not in columns:
            print("[MIGRATION] Adding 'username' column to 'users' table...")
            with engine.begin() as conn:
                if "postgresql" in str(engine.url):
                    conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(255)"))
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"))
            print("[MIGRATION] 'username' column added successfully.")
            
        # Add 'otp_created_at' if missing
        if 'otp_created_at' not in columns:
            print("[MIGRATION] Adding 'otp_created_at' column to 'users' table...")
            with engine.begin() as conn:
                if "postgresql" in str(engine.url):
                    conn.execute(text("ALTER TABLE users ADD COLUMN otp_created_at TIMESTAMP WITH TIME ZONE"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN otp_created_at DATETIME"))
            print("[MIGRATION] 'otp_created_at' column added successfully.")

        # Add 'credits' if missing
        if 'credits' not in columns:
            print("[MIGRATION] Adding 'credits' column to 'users' table...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 10"))
            print("[MIGRATION] 'credits' column added successfully.")

        # Add 'last_credit_reset' if missing
        if 'last_credit_reset' not in columns:
            print("[MIGRATION] Adding 'last_credit_reset' column to 'users' table...")
            with engine.begin() as conn:
                if "postgresql" in str(engine.url):
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN last_credit_reset DATETIME DEFAULT CURRENT_TIMESTAMP"))
            print("[MIGRATION] 'last_credit_reset' column added successfully.")

        # Ensure all existing users have a unique username (if NULL)
        with engine.begin() as conn:
            conn.execute(text("UPDATE users SET username = 'user_' || id WHERE username IS NULL"))

    # Check if 'user_profiles' table columns need migration
    if 'user_profiles' in inspector.get_table_names():
        up_columns = [c['name'] for c in inspector.get_columns('user_profiles')]
        if 'avatar_url' not in up_columns:
            print("[MIGRATION] Adding 'avatar_url' column to 'user_profiles' table...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT"))
            print("[MIGRATION] 'avatar_url' column added successfully.")
        else:
            # Ensure the column is TEXT to support long base64 data URLs on Vercel
            print("[MIGRATION] Ensuring 'avatar_url' column type is TEXT...")
            with engine.begin() as conn:
                if "postgresql" in str(engine.url):
                    conn.execute(text("ALTER TABLE user_profiles ALTER COLUMN avatar_url TYPE TEXT"))

        if 'looking_for_gender' not in up_columns:
            print("[MIGRATION] Adding 'looking_for_gender' column to 'user_profiles' table...")
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_profiles ADD COLUMN looking_for_gender VARCHAR(50) DEFAULT 'All'"))
            print("[MIGRATION] 'looking_for_gender' column added successfully.")

# Run migrations automatically on import
apply_db_migrations(engine)


