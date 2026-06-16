import os
import sys
import time

sys.path.insert(0, r"c:\Users\assud\Desktop\Konvo")
sys.path.insert(0, r"c:\Users\assud\Desktop\Konvo\packages\shared-utils")

from dotenv import load_dotenv
load_dotenv(r"c:\Users\assud\Desktop\Konvo\.env")

from database import engine
from sqlalchemy import text

print("Connecting to DB...")
with engine.connect() as conn:
    # Terminate all other postgres sessions
    print("Terminating other active postgres sessions to release locks...")
    term_res = conn.execute(text("""
        SELECT pid, pg_terminate_backend(pid), query
        FROM pg_stat_activity
        WHERE usename = 'postgres' AND pid != pg_backend_pid()
    """))
    terminated = 0
    for row in term_res:
        print(f"Terminated PID {row[0]} which had query: {row[2][:100]}")
        terminated += 1
    print(f"Terminated {terminated} stale postgres backends.")

# Now that all locks are cleared, let's run the migration!
print("Recreating database engine and running migrations...")
from database import Base, apply_db_migrations
import models

# Running metadata creation
print("Running Base.metadata.create_all...")
Base.metadata.create_all(bind=engine)
print("Base.metadata.create_all finished.")

print("Running apply_db_migrations...")
apply_db_migrations(engine)
print("Migrations finished successfully!")
