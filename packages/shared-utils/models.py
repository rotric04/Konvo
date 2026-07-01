from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Date, Time, JSON, Text
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    konvo_id = Column(String, unique=True, index=True, nullable=False) # e.g. KON-INTJ-72A91
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Phone register & OTP OTP verification
    phone = Column(String, nullable=True)
    otp_code = Column(String, nullable=True)
    otp_verified = Column(Boolean, default=False)
    otp_created_at = Column(DateTime, nullable=True)
    premium_user = Column(Boolean, default=False)
    refresh_token_hash = Column(String, nullable=True)
    credits = Column(Integer, default=10)
    last_credit_reset = Column(DateTime, default=datetime.utcnow)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    agent_twin = relationship("Agent", back_populates="creator", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    ledger_entries = relationship("BehavioralLedger", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    fingerprint = relationship("BehavioralFingerprint", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    embeddings = relationship("UserEmbedding", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    behavioral_signals = relationship("BehavioralSignal", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    personality_profile = relationship("PersonalityProfile", back_populates="user", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    interest_clusters_rel = relationship("InterestCluster", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    compatibility_vectors_rel = relationship("CompatibilityVector", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    social_vectors_rel = relationship("SocialVector", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    gender = Column(String, default="Unknown")
    looking_for_gender = Column(String, default="All")
    bio = Column(Text, nullable=True)
    relationship_intent = Column(String, default="Long Term") # Long Term, Casual, Friendship, Mentorship
    
    # Location details
    birth_date = Column(Date, nullable=True)
    birth_time = Column(Time, nullable=True)
    birth_location = Column(String, nullable=True)
    digipin = Column(String, nullable=True)
    sun_sign = Column(String, default="Aries")
    moon_sign = Column(String, default="Aries")
    ascendant = Column(String, default="Aries")
    interests = Column(JSON, default=list)
    goals = Column(JSON, default=list)
    avatar_url = Column(Text, nullable=True)


    # MBTI outputs
    mbti_type = Column(String, default="INTJ")
    mbti_confidence = Column(Float, default=75.0)
    mbti_summary = Column(Text, nullable=True)
    mbti_growth_areas = Column(JSON, default=list)
    mbti_communication_style = Column(Text, nullable=True)
    mbti_relationship_style = Column(Text, nullable=True)
    mbti_friendship_style = Column(Text, nullable=True)

    # Konvo DNA Indexes (0 - 100)
    dna_behavior = Column(Float, default=50.0)
    dna_personality = Column(Float, default=50.0)
    dna_communication = Column(Float, default=50.0)
    dna_relationship = Column(Float, default=50.0)
    dna_emotional = Column(Float, default=50.0)
    dna_lifestyle = Column(Float, default=50.0)
    dna_interest = Column(Float, default=50.0)
    dna_trust = Column(Float, default=50.0)
    dna_values = Column(Float, default=50.0)

    user = relationship("User", back_populates="profile")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="info") # e.g., "info", "warning", "success", "error"
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class BehavioralFingerprint(Base):
    __tablename__ = "behavioral_fingerprints"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    communication_style = Column(String, default="Analytical")
    debate_style = Column(String, default="Constructive")
    listening_score = Column(Float, default=70.0)
    empathy_index = Column(Float, default=70.0)
    curiosity_index = Column(Float, default=70.0)
    creativity_index = Column(Float, default=70.0)
    leadership_index = Column(Float, default=70.0)
    consistency_index = Column(Float, default=70.0)
    trust_index = Column(Float, default=70.0)
    contribution_score = Column(Float, default=70.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="fingerprint")

class BehavioralLedger(Base):
    __tablename__ = "behavioral_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    metric_changed = Column(String, nullable=False)
    previous_value = Column(Float, nullable=False)
    new_value = Column(Float, nullable=False)
    delta = Column(Float, nullable=False)
    reason = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ledger_entries")

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(String, unique=True, index=True, nullable=False) # e.g. AGENT-TWIN-1234
    name = Column(String, nullable=False)
    avatar = Column(Text, nullable=True) # SVG representation code
    description = Column(Text, nullable=True)
    role_type = Column(String, nullable=False) # The Strategist, The Explorer, The Builder, etc.
    prompt_template = Column(Text, nullable=False)
    
    creator_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    reputation = Column(Float, default=70.0)
    trust_score = Column(Float, default=70.0)
    usage_count = Column(Integer, default=0)
    
    # Matching styles
    voice_style = Column(String, default="Calm") # Calm, Expressive, Deep, Energetic
    emoji_style = Column(String, default="Minimalist") # Minimalist, Frequent, Sarcastic
    match_preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="agent_twin")

class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(Integer, primary_key=True, index=True)
    swiper_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    swipee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    swipe_type = Column(String, nullable=False) # pass, interest
    timestamp = Column(DateTime, default=datetime.utcnow)

class AgentDateSimulation(Base):
    __tablename__ = "agent_date_simulations"

    id = Column(Integer, primary_key=True, index=True)
    user_a_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_b_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    environment = Column(String, nullable=False) # Virtual Coffee Shop, Bookstore, etc.
    dialogue_log = Column(JSON, default=list) # [{'speaker': 'Agent A', 'message': '...'}, ...]
    overall_compatibility = Column(Float, default=70.0)
    match_detail_json = Column(JSON, default=dict) # breakdown scores: humour, values, chemistry
    
    # Approvals for unlocking human chat
    approval_user_a = Column(String, default="pending") # pending, approved, declined
    approval_user_b = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    reactions = Column(JSON, default=list) # [{'user_id': 1, 'emoji': '❤️'}]
    read_status = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Keep communities/posts stubs for microservice database structure
class Community(Base):
    __tablename__ = "communities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    health_score = Column(Float, default=80.0)
    quality_index = Column(Float, default=80.0)
    top_contributors = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sentiment_positive = Column(Float, default=0.0)
    sentiment_neutral = Column(Float, default=0.0)
    sentiment_negative = Column(Float, default=0.0)
    trait_supportive = Column(Float, default=0.0)
    trait_curious = Column(Float, default=0.0)
    trait_aggressive = Column(Float, default=0.0)
    trait_constructive = Column(Float, default=0.0)
    trait_analytical = Column(Float, default=0.0)
    trait_emotional = Column(Float, default=0.0)
    trait_humorous = Column(Float, default=0.0)
    trait_inspirational = Column(Float, default=0.0)
    constructiveness = Column(Float, default=50.0)
    fact_density = Column(Float, default=50.0)
    toxicity_risk = Column(Float, default=0.0)

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sentiment_positive = Column(Float, default=0.0)
    sentiment_neutral = Column(Float, default=0.0)
    sentiment_negative = Column(Float, default=0.0)
    trait_supportive = Column(Float, default=0.0)
    trait_curious = Column(Float, default=0.0)
    trait_aggressive = Column(Float, default=0.0)
    trait_constructive = Column(Float, default=0.0)
    trait_analytical = Column(Float, default=0.0)
    trait_emotional = Column(Float, default=0.0)
    trait_humorous = Column(Float, default=0.0)
    trait_inspirational = Column(Float, default=0.0)
    constructiveness = Column(Float, default=50.0)
    fact_density = Column(Float, default=50.0)
    toxicity_risk = Column(Float, default=0.0)


class UserEmbedding(Base):
    __tablename__ = "user_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    interest_vector = Column(JSON, nullable=True)
    social_vector = Column(JSON, nullable=True)
    humor_vector = Column(JSON, nullable=True)
    communication_vector = Column(JSON, nullable=True)
    curiosity_vector = Column(JSON, nullable=True)
    compatibility_vector = Column(JSON, nullable=True)
    emotional_vector = Column(JSON, nullable=True)
    lifestyle_vector = Column(JSON, nullable=True)

    user = relationship("User", back_populates="embeddings")


class BehavioralSignal(Base):
    __tablename__ = "behavioral_signals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scenario_choices = Column(JSON, default=dict)
    tradeoff_choices = Column(JSON, default=dict)
    open_responses = Column(JSON, default=dict)
    response_latencies = Column(JSON, default=dict)
    writing_style_metrics = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="behavioral_signals")


class PersonalityProfile(Base):
    __tablename__ = "personality_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    snapshot = Column(Text, nullable=True)
    mbti_prediction = Column(String, nullable=True)
    big_five_summary = Column(Text, nullable=True)
    communication_style = Column(Text, nullable=True)
    humor_style = Column(Text, nullable=True)
    social_energy = Column(Text, nullable=True)
    emotional_style = Column(Text, nullable=True)
    discovery_tags = Column(JSON, default=list)
    compatibility_markers = Column(JSON, default=list)
    conversation_hooks = Column(JSON, default=list)
    interest_clusters = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="personality_profile")


class InterestCluster(Base):
    __tablename__ = "interest_clusters"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    cluster_name = Column(String, nullable=False)
    score = Column(Float, default=0.0)

    user = relationship("User", back_populates="interest_clusters_rel")


class CompatibilityVector(Base):
    __tablename__ = "compatibility_vectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vector_data = Column(JSON, nullable=False)

    user = relationship("User", back_populates="compatibility_vectors_rel")


class SocialVector(Base):
    __tablename__ = "social_vectors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    vector_data = Column(JSON, nullable=False)

    user = relationship("User", back_populates="social_vectors_rel")

