-- Flick Database Schema
-- Supabase PostgreSQL Schema Definition

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════
-- DECKS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users(id)
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('text', 'pdf', 'url')),
    source_preview TEXT,
    card_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast user-specific deck lookups
CREATE INDEX IF NOT EXISTS decks_user_id_idx ON public.decks(user_id);


-- ═══════════════════════════════════════════
-- CARDS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id)
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    explanation TEXT,
    hint TEXT,
    next_review DATE DEFAULT CURRENT_DATE NOT NULL,
    interval_days INTEGER DEFAULT 0 NOT NULL,
    ease_factor NUMERIC DEFAULT 2.5 NOT NULL,
    repetitions INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS cards_deck_id_idx ON public.cards(deck_id);
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS cards_next_review_idx ON public.cards(next_review);


-- ═══════════════════════════════════════════
-- USER_STATS TABLE
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- References auth.users(id)
    streak INTEGER DEFAULT 0 NOT NULL,
    xp INTEGER DEFAULT 0 NOT NULL,
    total_cards_studied INTEGER DEFAULT 0 NOT NULL,
    last_study_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for stats lookups
CREATE INDEX IF NOT EXISTS user_stats_user_id_idx ON public.user_stats(user_id);


-- ═══════════════════════════════════════════
-- AUTOMATIC UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER set_decks_updated_at
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_stats_updated_at
    BEFORE UPDATE ON public.user_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
