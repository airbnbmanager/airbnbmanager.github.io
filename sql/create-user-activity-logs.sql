-- ═══════════════════════════════════════════════════════════════════
-- 🛡️ THE UNIQUE HAVEN HOMES — COMPREHENSIVE USER AUDIT & SCREEN TIME TABLES
-- Run this script in Supabase Dashboard → SQL Editor → Click "RUN"
--
-- WHAT THIS ENABLES:
-- 1. Real-time audit & screen time tracking for ALL users (Arman Khan, staff, viewers, caretakers, etc.)
-- 2. Creates 'user_activity_logs' and 'user_page_visits' tables with proper RLS policies
-- 3. Grants insert/update permissions so ANY logged-in staff member's activity is 100% saved
-- 4. Fixes app_settings RLS so non-admin users (like role: 'viewer') can write login alerts & activity
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- TABLE 1: user_activity_logs (Daily logins & screen time)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    display_name TEXT,
    role TEXT,
    email TEXT,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    login_count INT DEFAULT 1,
    active_seconds INT DEFAULT 0,
    first_login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    device_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop old policies if existing
DROP POLICY IF EXISTS "Allow authenticated access to user_activity_logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Allow anon access to user_activity_logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Allow all users to manage user_activity_logs" ON public.user_activity_logs;

-- Allow all authenticated and anon users to insert, select, update
CREATE POLICY "Allow all users to manage user_activity_logs"
ON public.user_activity_logs FOR ALL
USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_activity_logs TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE user_activity_logs_id_seq TO authenticated, anon, service_role;

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_date ON public.user_activity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_name ON public.user_activity_logs(display_name);

-- ─────────────────────────────────────────────────────────────────
-- TABLE 2: user_page_visits (Every page navigated in real-time)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_page_visits (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    display_name TEXT,
    role TEXT,
    email TEXT,
    page TEXT NOT NULL,
    device TEXT,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    month_str TEXT NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM')
);

ALTER TABLE public.user_page_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to manage user_page_visits" ON public.user_page_visits;
CREATE POLICY "Allow all users to manage user_page_visits"
ON public.user_page_visits FOR ALL
USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_page_visits TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE user_page_visits_id_seq TO authenticated, anon, service_role;

CREATE INDEX IF NOT EXISTS idx_user_page_visits_user_month ON public.user_page_visits(user_id, month_str);
CREATE INDEX IF NOT EXISTS idx_user_page_visits_date ON public.user_page_visits(visit_date);

-- ─────────────────────────────────────────────────────────────────
-- STEP 3: FIX app_settings RLS SO AUDIT KEYS CAN BE WRITTEN BY ALL
-- ─────────────────────────────────────────────────────────────────
-- Allow all authenticated users to read and update audit/alert keys
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'app_settings'
  ) THEN
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Allow all authenticated to read app_settings" ON public.app_settings;
    CREATE POLICY "Allow all authenticated to read app_settings"
    ON public.app_settings FOR SELECT
    USING (true);

    DROP POLICY IF EXISTS "Allow all users to manage audit app_settings" ON public.app_settings;
    CREATE POLICY "Allow all users to manage audit app_settings"
    ON public.app_settings FOR ALL
    USING (
      key IN ('user_daily_activity_logs', 'dev_login_alerts', 'uh_deleted_bookings_vault') 
      OR key LIKE 'uh_audit_visits_%'
      OR key LIKE 'uh_user_actions_%'
    )
    WITH CHECK (
      key IN ('user_daily_activity_logs', 'dev_login_alerts', 'uh_deleted_bookings_vault') 
      OR key LIKE 'uh_audit_visits_%'
      OR key LIKE 'uh_user_actions_%'
    );

    GRANT ALL ON TABLE public.app_settings TO authenticated, anon, service_role;
  END IF;
END $$;
