-- Micro-Catchment Retrofit Planner - Supabase Schema
-- Run this in Supabase SQL Editor to create the projects table

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  street_name TEXT NOT NULL,
  screenshot TEXT,
  features JSONB DEFAULT '[]'::JSONB,
  total_area NUMERIC DEFAULT 0,
  total_reduction NUMERIC DEFAULT 0,
  share_url TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_share_url_idx ON public.projects(share_url);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own projects
CREATE POLICY "Users can read own projects" ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own projects
CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Anyone can read projects via share_url (for public sharing)
CREATE POLICY "Anyone can read shared projects" ON public.projects
  FOR SELECT
  USING (share_url IS NOT NULL);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;
GRANT SELECT ON public.projects TO anon;
