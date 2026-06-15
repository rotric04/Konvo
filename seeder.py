import os
import sys
import random
from datetime import date, time, datetime
from sqlalchemy.orm import Session
from typing import Any

# Add current Cwd paths to PYTHONPATH to resolve shared-utils and shared-schemas
_curr = os.path.abspath(__file__)
_root = os.path.dirname(_curr)
sys.path.append(os.path.join(_root, "packages", "shared-utils"))
sys.path.append(os.path.join(_root, "packages", "shared-schemas"))

from database import engine, SessionLocal, Base
import models
import crud
import schemas
from algorithms.mbti_engine import QUESTIONS
from algorithms.sentiment import analyze_text
from algorithms.fingerprint import recalculate_fingerprint
from redis_client import redis_client
from neo4j_client import neo4j_client
from clickhouse_client import clickhouse_client
from vector_store import vector_store

def generate_answers_for_mbti(target_mbti: str) -> dict:
    answers = {}
    for q in QUESTIONS:
        dim = q["dimension"]
        # E vs I
        if dim in ["E", "I"]:
            is_match = (dim == "E" and "E" in target_mbti) or (dim == "I" and "I" in target_mbti)
            score = 5 if is_match else 1
        # N vs S
        elif dim in ["N", "S"]:
            is_match = (dim == "N" and "N" in target_mbti) or (dim == "S" and "S" in target_mbti)
            score = 5 if is_match else 1
        # T vs F
        elif dim in ["T", "F"]:
            is_match = (dim == "T" and "T" in target_mbti) or (dim == "F" and "F" in target_mbti)
            score = 5 if is_match else 1
        # J vs P
        elif dim in ["J", "P"]:
            is_match = (dim == "J" and "J" in target_mbti) or (dim == "P" and "P" in target_mbti)
            score = 5 if is_match else 1
        else:
            score = 3
        # Add random variance
        score = max(1, min(5, score + random.choice([-1, 0, 1])))
        answers[str(q["id"])] = score
    return answers

def seed_database():
    if os.getenv("ENV") == "production":
        print("[SEEDER BLOCK] Running the seeder script is prohibited in production!")
        return

    print("Dropping all existing database tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Flush Redis rate limit keys
    try:
        redis_client.client.flushdb()
        print("Redis cache flushed.")
    except Exception as e:
        print(f"Warning: Redis flush skipped: {e}")

    db: Session = SessionLocal()
    try:
        print("Creating communities...")
        communities = [
            models.Community(name="AI & Cognitive Systems", slug="ai-cognitive-systems", description="Exploring neural designs, human intelligence interfaces, and agentic workflows."),
            models.Community(name="Startups & Venture Logic", slug="startups-venture-logic", description="For founders, builders, and strategists. Discussions on business models, traction, and scaling."),
            models.Community(name="Psychology & Behavioral Science", slug="psychology-behavioral-science", description="Understanding human behavior, cognitive patterns, emotional mechanics, and compatibility."),
            models.Community(name="System Architecture & Coding", slug="system-architecture-coding", description="Discussions on scaling infrastructure, clean code, database algorithms, and systems engineering.")
        ]
        for c in communities:
            db.add(c)
        db.commit()
        for c in communities:
            db.refresh(c)

        # 5 Seed user credentials and profiles
        users_raw: list[dict[str, Any]] = [
            {
                "email": "evelyn@konvo.app",
                "username": "evelyn",
                "password": "evelynpassword123",
                "display_name": "Dr. Evelyn Vance",
                "gender": "Female",
                "phone": "+16175550192",
                "relationship_intent": "Friendship",
                "interests": ["psychology", "education", "spirituality"],
                "goals": ["Understand human synergy", "Build collaborative networks"],
                "birth_date": date(1982, 5, 14),
                "birth_time": time(8, 30),
                "birth_location": "Boston, MA",
                "digipin": "8Y1A3B5C7D",
                "target_mbti": "INFJ"
            },
            {
                "email": "marcus@konvo.app",
                "username": "marcus",
                "password": "marcuspassword123",
                "display_name": "Marcus Chen",
                "gender": "Male",
                "phone": "+14155550293",
                "relationship_intent": "Long Term",
                "interests": ["startups", "programming", "ai"],
                "goals": ["Scale platform designs", "Discover product-market fit"],
                "birth_date": date(1988, 11, 23),
                "birth_time": time(14, 15),
                "birth_location": "San Francisco, CA",
                "digipin": "8Y1A3B5C7E",
                "target_mbti": "INTJ"
            },
            {
                "email": "sophia@konvo.app",
                "username": "sophia",
                "password": "sophiapassword123",
                "display_name": "Sophia Patel",
                "gender": "Female",
                "phone": "+442079460192",
                "relationship_intent": "Long Term",
                "interests": ["ai", "science", "programming"],
                "goals": ["Optimize natural language parsing", "Create explainable interfaces"],
                "birth_date": date(1991, 7, 8),
                "birth_time": time(22, 10),
                "birth_location": "London, UK",
                "digipin": "8Y1A3B9C2A",
                "target_mbti": "ENFP"
            },
            {
                "email": "lucas@konvo.app",
                "username": "lucas",
                "password": "lucaspassword123",
                "display_name": "Lucas Gallagher",
                "gender": "Male",
                "phone": "+15125550384",
                "relationship_intent": "Casual",
                "interests": ["art", "spirituality", "psychology"],
                "goals": ["Design organic digital interfaces", "Inspire creative thinking"],
                "birth_date": date(1985, 2, 19),
                "birth_time": time(17, 45),
                "birth_location": "Austin, TX",
                "digipin": "8Y2A1B3C5D",
                "target_mbti": "INFP"
            },
            {
                "email": "naomi@konvo.app",
                "username": "naomi",
                "password": "naomipassword123",
                "display_name": "Naomi Sterling",
                "gender": "Female",
                "phone": "+12065550472",
                "relationship_intent": "Friendship",
                "interests": ["programming", "science", "career"],
                "goals": ["Deploy fault-tolerant networks", "Reduce latency budgets"],
                "birth_date": date(1979, 9, 3),
                "birth_time": time(4, 15),
                "birth_location": "Seattle, WA",
                "digipin": "1A2B3C4D5E",
                "target_mbti": "ISTJ"
            }
        ]

        seeded_users = []
        for ur in users_raw:
            print(f"Seeding user: {ur['display_name']} ({ur['email']})...")
            # Create user in database
            reg_schema = schemas.UserRegister(
                email=ur["email"],
                username=ur["username"],
                password=ur["password"],
                display_name=ur["display_name"],
                phone=ur["phone"],
                gender=ur["gender"],
                relationship_intent=ur["relationship_intent"],
                interests=ur["interests"],
                goals=ur["goals"],
                birth_date=ur["birth_date"],
                birth_time=ur["birth_time"],
                birth_location=ur["birth_location"],
                digipin=ur.get("digipin")
            )
            
            user_db = crud.create_user(db, reg_schema)
            # Verify OTP immediately
            user_db.otp_verified = True  # type: ignore
            db.commit()
            
            # Submit Personality Quiz Answers to generate MBTI and DNA structures
            answers = generate_answers_for_mbti(ur["target_mbti"])
            crud.submit_personality_assessment(db, user_db.id, answers)  # type: ignore
            
            # Refresh user from database to load relationships
            db.refresh(user_db)
            seeded_users.append(user_db)

        # Load users for swiping interactions
        # Evelyn (INFJ), Marcus (INTJ), Sophia (ENFP), Lucas (INFP), Naomi (ISTJ)
        ev, ma, so, lu, na = seeded_users

        print("\nCreating Swipe relationships and triggering Twin Date Simulations...")
        
        # 1. Marcus (INTJ) likes Sophia (ENFP)
        swipe_m_s = schemas.SwipeRequest(target_user_id=so.id, swipe_type="interest")
        res1 = crud.execute_swipe(db, ma.id, swipe_m_s)
        # 2. Sophia (ENFP) likes Marcus (INTJ) -> Mutual match match!
        swipe_s_m = schemas.SwipeRequest(target_user_id=ma.id, swipe_type="interest")
        res2 = crud.execute_swipe(db, so.id, swipe_s_m)
        print(f"Marcus <-> Sophia Swipe: Match={res2.get('match_occurred')}, SimID={res2.get('simulation_id')}")

        # 3. Evelyn (INFJ) likes Lucas (INFP)
        swipe_e_l = schemas.SwipeRequest(target_user_id=lu.id, swipe_type="interest")
        res3 = crud.execute_swipe(db, ev.id, swipe_e_l)
        # 4. Lucas (INFP) likes Evelyn (INFJ) -> Mutual match!
        swipe_l_e = schemas.SwipeRequest(target_user_id=ev.id, swipe_type="interest")
        res4 = crud.execute_swipe(db, lu.id, swipe_l_e)
        print(f"Evelyn <-> Lucas Swipe: Match={res4.get('match_occurred')}, SimID={res4.get('simulation_id')}")

        # 5. Naomi (ISTJ) swipes one-way on Marcus (INTJ)
        swipe_n_m = schemas.SwipeRequest(target_user_id=ma.id, swipe_type="interest")
        crud.execute_swipe(db, na.id, swipe_n_m)
        
        # 6. Sophia (ENFP) swipes pass on Naomi (ISTJ)
        swipe_s_n = schemas.SwipeRequest(target_user_id=na.id, swipe_type="pass")
        crud.execute_swipe(db, so.id, swipe_s_n)

        print("\nConfiguring Date Approvals and unlocking direct Human Chats...")
        
        # Marcus and Sophia approve their simulated date
        sim_ms = db.query(models.AgentDateSimulation).filter(
            models.AgentDateSimulation.id == res2["simulation_id"]
        ).first()
        if sim_ms:
            sim_ms.approval_user_a = "approved"  # type: ignore
            sim_ms.approval_user_b = "approved"  # type: ignore
            db.commit()
            print("Marcus & Sophia: Both approved virtual date. Direct chat UNLOCKED!")

            # Write seed direct messages
            crud.create_chat_message(db, ma.id, so.id, "Hey Sophia, our twins' coffee date simulation log was incredibly accurate. They discussed abstract systemic patterns.")
            crud.create_chat_message(db, so.id, ma.id, "I know! It said we have strong values alignment but might run into timing conflicts. How are you?")
            crud.create_chat_message(db, ma.id, so.id, "Pretty good. Working on some new Postgres consensus scripts. Want to grab coffee in the real world?")
        
        # Evelyn approves Lucas, but Lucas remains pending
        sim_el = db.query(models.AgentDateSimulation).filter(
            models.AgentDateSimulation.id == res4["simulation_id"]
        ).first()
        if sim_el:
            sim_el.approval_user_a = "approved"  # type: ignore
            sim_el.approval_user_b = "pending"   # type: ignore
            db.commit()
            print("Evelyn & Lucas: Evelyn approved, Lucas is pending.")

        # Recalculate baseline fingerprints and write ledgers
        print("\nWriting final ledger items and fingerprint histories...")
        for u in seeded_users:
            recalculate_fingerprint(db, u.id)
            
        print("\nSeeding completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
