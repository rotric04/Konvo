-- schema.sql
-- Production database schema for Supabase (PostgreSQL)
-- Act as a security researcher: Includes strict Row Level Security (RLS) and query indexes.

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    konvo_id VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    phone VARCHAR(50),
    otp_code VARCHAR(10),
    otp_verified BOOLEAN DEFAULT FALSE,
    otp_created_at TIMESTAMP WITH TIME ZONE,
    premium_user BOOLEAN DEFAULT FALSE,
    refresh_token_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    gender VARCHAR(50) DEFAULT 'Unknown',
    bio TEXT,
    relationship_intent VARCHAR(50) DEFAULT 'Long Term',
    birth_date DATE,
    birth_time TIME,
    birth_location VARCHAR(255),
    digipin VARCHAR(10),
    sun_sign VARCHAR(50) DEFAULT 'Aries',
    moon_sign VARCHAR(50) DEFAULT 'Aries',
    ascendant VARCHAR(50) DEFAULT 'Aries',
    interests JSONB DEFAULT '[]'::jsonb,
    goals JSONB DEFAULT '[]'::jsonb,
    mbti_type VARCHAR(10) DEFAULT 'INTJ',
    mbti_confidence FLOAT DEFAULT 75.0,
    mbti_summary TEXT,
    mbti_growth_areas JSONB DEFAULT '[]'::jsonb,
    mbti_communication_style TEXT,
    mbti_relationship_style TEXT,
    mbti_friendship_style TEXT,
    dna_behavior FLOAT DEFAULT 50.0,
    dna_personality FLOAT DEFAULT 50.0,
    dna_communication FLOAT DEFAULT 50.0,
    dna_relationship FLOAT DEFAULT 50.0,
    dna_emotional FLOAT DEFAULT 50.0,
    dna_lifestyle FLOAT DEFAULT 50.0,
    dna_interest FLOAT DEFAULT 50.0,
    dna_trust FLOAT DEFAULT 50.0,
    dna_values FLOAT DEFAULT 50.0
);

CREATE TABLE IF NOT EXISTS behavioral_fingerprints (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    communication_style VARCHAR(50) DEFAULT 'Analytical',
    debate_style VARCHAR(50) DEFAULT 'Constructive',
    listening_score FLOAT DEFAULT 70.0,
    empathy_index FLOAT DEFAULT 70.0,
    curiosity_index FLOAT DEFAULT 70.0,
    creativity_index FLOAT DEFAULT 70.0,
    leadership_index FLOAT DEFAULT 70.0,
    consistency_index FLOAT DEFAULT 70.0,
    trust_index FLOAT DEFAULT 70.0,
    contribution_score FLOAT DEFAULT 70.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS behavioral_ledger (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    metric_changed VARCHAR(100) NOT NULL,
    previous_value FLOAT NOT NULL,
    new_value FLOAT NOT NULL,
    delta FLOAT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar TEXT,
    description TEXT,
    role_type VARCHAR(100) NOT NULL,
    prompt_template TEXT NOT NULL,
    creator_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reputation FLOAT DEFAULT 70.0,
    trust_score FLOAT DEFAULT 70.0,
    usage_count INTEGER DEFAULT 0,
    voice_style VARCHAR(50) DEFAULT 'Calm',
    emoji_style VARCHAR(50) DEFAULT 'Minimalist',
    match_preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS swipes (
    id SERIAL PRIMARY KEY,
    swiper_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    swipee_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    swipe_type VARCHAR(20) NOT NULL, -- 'pass' or 'interest'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_swipe UNIQUE (swiper_id, swipee_id)
);

CREATE TABLE IF NOT EXISTS agent_date_simulations (
    id SERIAL PRIMARY KEY,
    user_a_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    user_b_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    environment VARCHAR(100) NOT NULL,
    dialogue_log JSONB DEFAULT '[]'::jsonb,
    overall_compatibility FLOAT DEFAULT 70.0,
    match_detail_json JSONB DEFAULT '{}'::jsonb,
    approval_user_a VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'declined'
    approval_user_b VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    reactions JSONB DEFAULT '[]'::jsonb,
    read_status BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    health_score FLOAT DEFAULT 80.0,
    quality_index FLOAT DEFAULT 80.0,
    top_contributors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    community_id INTEGER REFERENCES communities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sentiment_positive FLOAT DEFAULT 0.0,
    sentiment_neutral FLOAT DEFAULT 0.0,
    sentiment_negative FLOAT DEFAULT 0.0,
    trait_supportive FLOAT DEFAULT 0.0,
    trait_curious FLOAT DEFAULT 0.0,
    trait_aggressive FLOAT DEFAULT 0.0,
    trait_constructive FLOAT DEFAULT 0.0,
    trait_analytical FLOAT DEFAULT 0.0,
    trait_emotional FLOAT DEFAULT 0.0,
    trait_humorous FLOAT DEFAULT 0.0,
    trait_inspirational FLOAT DEFAULT 0.0,
    constructiveness FLOAT DEFAULT 50.0,
    fact_density FLOAT DEFAULT 50.0,
    toxicity_risk FLOAT DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    parent_id INTEGER REFERENCES comments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sentiment_positive FLOAT DEFAULT 0.0,
    sentiment_neutral FLOAT DEFAULT 0.0,
    sentiment_negative FLOAT DEFAULT 0.0,
    trait_supportive FLOAT DEFAULT 0.0,
    trait_curious FLOAT DEFAULT 0.0,
    trait_aggressive FLOAT DEFAULT 0.0,
    trait_constructive FLOAT DEFAULT 0.0,
    trait_analytical FLOAT DEFAULT 0.0,
    trait_emotional FLOAT DEFAULT 0.0,
    trait_humorous FLOAT DEFAULT 0.0,
    trait_inspirational FLOAT DEFAULT 0.0,
    constructiveness FLOAT DEFAULT 50.0,
    fact_density FLOAT DEFAULT 50.0,
    toxicity_risk FLOAT DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS feedback_entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    severity VARCHAR(50),
    priority VARCHAR(50),
    category VARCHAR(100),
    tags JSONB DEFAULT '[]'::jsonb,
    rating INTEGER,
    steps TEXT,
    page VARCHAR(255),
    browser VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 2. Query Optimization Indexes for High Simultaneous Concurrency (1000+ users)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_konvo_id ON users(konvo_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_fingerprints_user_id ON behavioral_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_ledger_user_id ON behavioral_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_creator_id ON agents(creator_id);
CREATE INDEX IF NOT EXISTS idx_agents_agent_id ON agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swipee ON swipes(swiper_id, swipee_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver ON chat_messages(sender_id, receiver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback_entries(user_id);


-- 3. Enable Row Level Security (RLS) for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_date_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;


-- 4. Create RLS Policies
-- Note: Assuming auth.uid() resolves to the authenticated user ID (standard Supabase JWT mapping)

-- Users Policies
DROP POLICY IF EXISTS user_read_own ON users;
CREATE POLICY user_read_own ON users 
    FOR SELECT USING (auth.uid()::text = id::text OR role = 'admin');

DROP POLICY IF EXISTS user_update_own ON users;
CREATE POLICY user_update_own ON users 
    FOR UPDATE USING (auth.uid()::text = id::text OR role = 'admin');

-- User Profiles Policies
DROP POLICY IF EXISTS profile_read_all ON user_profiles;
CREATE POLICY profile_read_all ON user_profiles 
    FOR SELECT USING (true); -- profiles are discoverable

DROP POLICY IF EXISTS profile_write_own ON user_profiles;
CREATE POLICY profile_write_own ON user_profiles 
    FOR ALL USING (auth.uid()::text = user_id::text OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Behavioral Fingerprints Policies
DROP POLICY IF EXISTS fingerprint_read_all ON behavioral_fingerprints;
CREATE POLICY fingerprint_read_all ON behavioral_fingerprints 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS fingerprint_write_own ON behavioral_fingerprints;
CREATE POLICY fingerprint_write_own ON behavioral_fingerprints 
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Behavioral Ledger Policies
DROP POLICY IF EXISTS ledger_read_own ON behavioral_ledger;
CREATE POLICY ledger_read_own ON behavioral_ledger 
    FOR SELECT USING (auth.uid()::text = user_id::text OR EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Agents Policies
DROP POLICY IF EXISTS agents_read_all ON agents;
CREATE POLICY agents_read_all ON agents 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS agents_write_own ON agents;
CREATE POLICY agents_write_own ON agents 
    FOR ALL USING (auth.uid()::text = creator_id::text);

-- Swipes Policies
DROP POLICY IF EXISTS swipes_read_own ON swipes;
CREATE POLICY swipes_read_own ON swipes 
    FOR SELECT USING (auth.uid()::text = swiper_id::text OR auth.uid()::text = swipee_id::text);

DROP POLICY IF EXISTS swipes_insert_own ON swipes;
CREATE POLICY swipes_insert_own ON swipes 
    FOR INSERT WITH CHECK (auth.uid()::text = swiper_id::text);

-- Agent Date Simulations Policies
DROP POLICY IF EXISTS sim_read_own ON agent_date_simulations;
CREATE POLICY sim_read_own ON agent_date_simulations 
    FOR SELECT USING (auth.uid()::text = user_a_id::text OR auth.uid()::text = user_b_id::text);

DROP POLICY IF EXISTS sim_write_own ON agent_date_simulations;
CREATE POLICY sim_write_own ON agent_date_simulations 
    FOR UPDATE USING (auth.uid()::text = user_a_id::text OR auth.uid()::text = user_b_id::text);

-- Chat Messages Policies
DROP POLICY IF EXISTS chat_read_own ON chat_messages;
CREATE POLICY chat_read_own ON chat_messages 
    FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

DROP POLICY IF EXISTS chat_insert_own ON chat_messages;
CREATE POLICY chat_insert_own ON chat_messages 
    FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

-- Notifications Policies
DROP POLICY IF EXISTS notification_read_own ON notifications;
CREATE POLICY notification_read_own ON notifications 
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS notification_write_own ON notifications;
CREATE POLICY notification_write_own ON notifications 
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Posts Policies
DROP POLICY IF EXISTS posts_read_all ON posts;
CREATE POLICY posts_read_all ON posts 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS posts_insert_own ON posts;
CREATE POLICY posts_insert_own ON posts 
    FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

DROP POLICY IF EXISTS posts_modify_own ON posts;
CREATE POLICY posts_modify_own ON posts 
    FOR UPDATE USING (auth.uid()::text = author_id::text);

-- Comments Policies
DROP POLICY IF EXISTS comments_read_all ON comments;
CREATE POLICY comments_read_all ON comments 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS comments_insert_own ON comments;
CREATE POLICY comments_insert_own ON comments 
    FOR INSERT WITH CHECK (auth.uid()::text = author_id::text);

-- Feedback Entries Policies
DROP POLICY IF EXISTS feedback_insert_all ON feedback_entries;
CREATE POLICY feedback_insert_all ON feedback_entries 
    FOR INSERT WITH CHECK (true); -- Allow feedback submission from anyone

DROP POLICY IF EXISTS feedback_read_admin ON feedback_entries;
CREATE POLICY feedback_read_admin ON feedback_entries 
    FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- Communities Policies
DROP POLICY IF EXISTS communities_read_all ON communities;
CREATE POLICY communities_read_all ON communities 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS communities_admin_all ON communities;
CREATE POLICY communities_admin_all ON communities 
    FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id::text = auth.uid()::text AND role = 'admin'));

-- 5. Cognitive Calibration 4.0 Tables
CREATE TABLE IF NOT EXISTS user_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    interest_vector JSONB,
    social_vector JSONB,
    humor_vector JSONB,
    communication_vector JSONB,
    curiosity_vector JSONB,
    compatibility_vector JSONB,
    emotional_vector JSONB,
    lifestyle_vector JSONB
);

CREATE TABLE IF NOT EXISTS behavioral_signals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    scenario_choices JSONB DEFAULT '{}'::jsonb,
    tradeoff_choices JSONB DEFAULT '{}'::jsonb,
    open_responses JSONB DEFAULT '{}'::jsonb,
    response_latencies JSONB DEFAULT '{}'::jsonb,
    writing_style_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS personality_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    snapshot TEXT,
    mbti_prediction VARCHAR(50),
    big_five_summary TEXT,
    communication_style TEXT,
    humor_style TEXT,
    social_energy TEXT,
    emotional_style TEXT,
    discovery_tags JSONB DEFAULT '[]'::jsonb,
    compatibility_markers JSONB DEFAULT '[]'::jsonb,
    conversation_hooks JSONB DEFAULT '[]'::jsonb,
    interest_clusters JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS interest_clusters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    cluster_name VARCHAR(255) NOT NULL,
    score FLOAT DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS compatibility_vectors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    vector_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS social_vectors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    vector_data JSONB NOT NULL
);

-- Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_id ON user_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_signals_user_id ON behavioral_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_personality_profiles_user_id ON personality_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_interest_clusters_user_id ON interest_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_vectors_user_id ON compatibility_vectors(user_id);
CREATE INDEX IF NOT EXISTS idx_social_vectors_user_id ON social_vectors(user_id);

-- Enable RLS
ALTER TABLE user_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_vectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS user_embeddings_read_all ON user_embeddings;
CREATE POLICY user_embeddings_read_all ON user_embeddings FOR SELECT USING (true);
DROP POLICY IF EXISTS user_embeddings_write_own ON user_embeddings;
CREATE POLICY user_embeddings_write_own ON user_embeddings FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS behavioral_signals_read_own ON behavioral_signals;
CREATE POLICY behavioral_signals_read_own ON behavioral_signals FOR SELECT USING (auth.uid()::text = user_id::text);
DROP POLICY IF EXISTS behavioral_signals_write_own ON behavioral_signals;
CREATE POLICY behavioral_signals_write_own ON behavioral_signals FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS personality_profiles_read_all ON personality_profiles;
CREATE POLICY personality_profiles_read_all ON personality_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS personality_profiles_write_own ON personality_profiles;
CREATE POLICY personality_profiles_write_own ON personality_profiles FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS interest_clusters_read_all ON interest_clusters;
CREATE POLICY interest_clusters_read_all ON interest_clusters FOR SELECT USING (true);
DROP POLICY IF EXISTS interest_clusters_write_own ON interest_clusters;
CREATE POLICY interest_clusters_write_own ON interest_clusters FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS compatibility_vectors_read_all ON compatibility_vectors;
CREATE POLICY compatibility_vectors_read_all ON compatibility_vectors FOR SELECT USING (true);
DROP POLICY IF EXISTS compatibility_vectors_write_own ON compatibility_vectors;
CREATE POLICY compatibility_vectors_write_own ON compatibility_vectors FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS social_vectors_read_all ON social_vectors;
CREATE POLICY social_vectors_read_all ON social_vectors FOR SELECT USING (true);
DROP POLICY IF EXISTS social_vectors_write_own ON social_vectors;
CREATE POLICY social_vectors_write_own ON social_vectors FOR ALL USING (auth.uid()::text = user_id::text);

