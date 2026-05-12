-- Create analytics tables for visitor, region, usage, and navigation tracking

-- 1. Analytics Sessions Table
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  page_views_count INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,
  is_authenticated BOOLEAN DEFAULT FALSE,
  user_role TEXT,
  subscription_tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Analytics Page Views Table
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_metadata JSONB,
  page_path TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Analytics Navigation Paths Table
CREATE TABLE IF NOT EXISTS public.analytics_navigation_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_path TEXT,
  to_path TEXT NOT NULL,
  breadcrumb_trail JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user_id ON public.analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_page_views_session_id ON public.analytics_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_timestamp ON public.analytics_page_views(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_user_id ON public.analytics_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_page_path ON public.analytics_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_page_views_country ON public.analytics_page_views(country);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON public.analytics_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_navigation_paths_session_id ON public.analytics_navigation_paths(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_navigation_paths_timestamp ON public.analytics_navigation_paths(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_navigation_paths_from_path ON public.analytics_navigation_paths(from_path);
CREATE INDEX IF NOT EXISTS idx_analytics_navigation_paths_to_path ON public.analytics_navigation_paths(to_path);

-- Enable Row Level Security
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_navigation_paths ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can read analytics data
CREATE POLICY "Only admins can view analytics sessions"
  ON public.analytics_sessions
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view analytics page views"
  ON public.analytics_page_views
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view analytics events"
  ON public.analytics_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view analytics navigation paths"
  ON public.analytics_navigation_paths
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public insert for anonymous tracking
CREATE POLICY "Anyone can insert page views"
  ON public.analytics_page_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert navigation paths"
  ON public.analytics_navigation_paths
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can insert sessions"
  ON public.analytics_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their session"
  ON public.analytics_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);