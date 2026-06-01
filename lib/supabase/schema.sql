-- ==========================================
-- SUPABASE OFFLINE-FIRST BACKEND SCHEMA
-- ==========================================

-- 1. PROFILES TABLE
-- Auto-synced from Auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  username TEXT,
  avatar_url TEXT
);

-- Enable Row-Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Allow user update access to own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. USER VOCABULARY TABLE
CREATE TABLE IF NOT EXISTS public.user_vocabulary (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  word_name TEXT NOT NULL,
  translation TEXT NOT NULL,
  level TEXT,
  status TEXT DEFAULT 'new'::text,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;

-- Vocabulary Policies
CREATE POLICY "Users can fully manage their own vocabulary records" 
  ON public.user_vocabulary 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 3. USER GRAMMAR TABLE
CREATE TABLE IF NOT EXISTS public.user_grammar (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  example TEXT,
  is_deleted BOOLEAN DEFAULT false NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row-Level Security
ALTER TABLE public.user_grammar ENABLE ROW LEVEL SECURITY;

-- Grammar Policies
CREATE POLICY "Users can fully manage their own grammar records" 
  ON public.user_grammar 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 4. UTILITIES: TIMESTAMP UPDATE TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vocabulary Timestamp Trigger
DROP TRIGGER IF EXISTS set_vocab_updated_at ON public.user_vocabulary;
CREATE TRIGGER set_vocab_updated_at 
  BEFORE UPDATE ON public.user_vocabulary 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();

-- Grammar Timestamp Trigger
DROP TRIGGER IF EXISTS set_grammar_updated_at ON public.user_grammar;
CREATE TRIGGER set_grammar_updated_at 
  BEFORE UPDATE ON public.user_grammar 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. UTILITIES: USER REGISTRATION AUTO-PROFILE GENERATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', 'Learner_' || substring(new.id::text, 1, 6)), 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger linked to auth.users created event
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
