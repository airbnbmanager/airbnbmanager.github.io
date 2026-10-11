-- ========================================================
-- Table: user_activity_logs
-- Tracks daily user logins, active session screen time, and status
-- ========================================================

CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    display_name TEXT,
    role TEXT,
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

-- Allow authenticated users to read and update logs
CREATE POLICY "Allow authenticated access to user_activity_logs"
ON public.user_activity_logs FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Allow public read/write if anon key is used
CREATE POLICY "Allow anon access to user_activity_logs"
ON public.user_activity_logs FOR ALL TO anon
USING (true) WITH CHECK (true);

-- Index for fast daily queries
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_date ON public.user_activity_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user ON public.user_activity_logs(user_id);
