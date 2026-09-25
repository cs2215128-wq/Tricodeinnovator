-- ============================================================================
-- ResearchPilot AI — PostgreSQL Database Schema
-- Run this script in your PostgreSQL / Replit Postgres / Supabase SQL Editor
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Gamification Profiles Table
CREATE TABLE IF NOT EXISTS gamification_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_xp INT DEFAULT 0,
    weekly_xp INT DEFAULT 0,
    current_level INT DEFAULT 1,
    current_streak INT DEFAULT 0,
    league_tier VARCHAR(50) DEFAULT 'Bronze',
    trees_grown INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Uploaded Sources Table
CREATE TABLE IF NOT EXISTS uploaded_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    storage_url TEXT,
    raw_text TEXT,
    parsed_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Source Embeddings Table (pgvector 768 dimensions)
CREATE TABLE IF NOT EXISTS source_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES uploaded_sources(id) ON DELETE CASCADE,
    chunk_content TEXT NOT NULL,
    page_or_timestamp VARCHAR(50),
    embedding vector(768) NOT NULL
);

-- 6. HNSW Cosine Similarity Index
CREATE INDEX IF NOT EXISTS source_embeddings_hnsw_idx
ON source_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 7. Generated Courses Table
CREATE TABLE IF NOT EXISTS generated_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_title VARCHAR(255) NOT NULL,
    course_structure JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Active Quiz Sessions Table
CREATE TABLE IF NOT EXISTS active_quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES generated_courses(id) ON DELETE CASCADE,
    quiz_name VARCHAR(255) NOT NULL,
    current_question_index INT DEFAULT 0,
    user_answers JSONB DEFAULT '[]'::jsonb,
    is_completed BOOLEAN DEFAULT FALSE,
    xp_earned INT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Academic Schedules Table
CREATE TABLE IF NOT EXISTS academic_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    color_code VARCHAR(10) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_sources_user_id ON uploaded_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_source_embeddings_source_id ON source_embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_generated_courses_user_id ON generated_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_schedules_user_id ON academic_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_schedules_start ON academic_schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_gamification_weekly_xp ON gamification_profiles(weekly_xp DESC);
