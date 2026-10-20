-- ═══════════════════════════════════════════════════════════════════
-- 🛡️ THE UNIQUE HAVEN HOMES — MASTER SECURITY & ANTI-LEAK HARDENING
-- Run this in Supabase Dashboard → SQL Editor → Click "RUN"
--
-- WHAT THIS FIXES:
-- 1. Prevents anonymous internet users from downloading guest names,
--    phone numbers, Aadhaar/ID proofs, and financial records.
-- 2. Restricts financial tables (payment_history, expenses, OD, cashbook)
--    to authenticated staff only.
-- 3. Prevents privilege escalation (users cannot self-promote to admin).
-- 4. Preserves public website booking (book.html) and calendar availability.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS) ON ALL CRITICAL TABLES
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.guest_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.uhhs_od_account ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cash_holders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cash_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.salary_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.advance_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.daily_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attendance_log ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- STEP 2: REVOKE PUBLIC/ANON ACCESS TO CONFIDENTIAL FINANCIAL DATA
-- ─────────────────────────────────────────────────────────────────
-- Completely block unauthenticated access to financials, staff, and cash
REVOKE ALL ON TABLE public.payment_history FROM anon;
REVOKE ALL ON TABLE public.expenses FROM anon;
REVOKE ALL ON TABLE public.employees FROM anon;
REVOKE ALL ON TABLE public.uhhs_od_account FROM anon;
REVOKE ALL ON TABLE public.account_transactions FROM anon;
REVOKE ALL ON TABLE public.cash_holders FROM anon;
REVOKE ALL ON TABLE public.cash_handovers FROM anon;
REVOKE ALL ON TABLE public.company_advances FROM anon;
REVOKE ALL ON TABLE public.salary_tracker FROM anon;
REVOKE ALL ON TABLE public.advance_tracker FROM anon;
REVOKE ALL ON TABLE public.daily_expenses FROM anon;
REVOKE ALL ON TABLE public.attendance_log FROM anon;
REVOKE ALL ON TABLE public.profiles FROM anon;

-- Grant access to authenticated staff
GRANT ALL ON TABLE public.payment_history TO authenticated;
GRANT ALL ON TABLE public.expenses TO authenticated;
GRANT ALL ON TABLE public.employees TO authenticated;
GRANT ALL ON TABLE public.uhhs_od_account TO authenticated;
GRANT ALL ON TABLE public.account_transactions TO authenticated;
GRANT ALL ON TABLE public.cash_holders TO authenticated;
GRANT ALL ON TABLE public.cash_handovers TO authenticated;
GRANT ALL ON TABLE public.company_advances TO authenticated;
GRANT ALL ON TABLE public.salary_tracker TO authenticated;
GRANT ALL ON TABLE public.advance_tracker TO authenticated;
GRANT ALL ON TABLE public.daily_expenses TO authenticated;
GRANT ALL ON TABLE public.attendance_log TO authenticated;
GRANT ALL ON TABLE public.profiles TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- STEP 3: GUEST REGISTER COLUMN-LEVEL PRIVACY (ANTI-PII LEAK)
-- ─────────────────────────────────────────────────────────────────
-- Anon (website visitors) may only check room availability and submit bookings
REVOKE SELECT ON TABLE public.guest_register FROM anon;
GRANT SELECT (room_id, check_in, check_out, is_cancelled) ON TABLE public.guest_register TO anon;
GRANT INSERT ON TABLE public.guest_register TO anon;
GRANT ALL ON TABLE public.guest_register TO authenticated;

-- Drop insecure legacy policies
DROP POLICY IF EXISTS "Allow anon manage OD" ON public.uhhs_od_account;
DROP POLICY IF EXISTS "Allow public read OD" ON public.uhhs_od_account;
DROP POLICY IF EXISTS "Allow anon access to user_activity_logs" ON public.user_activity_logs;

-- Clean RLS Policies for Staff
DROP POLICY IF EXISTS "Staff manage guest_register" ON public.guest_register;
CREATE POLICY "Staff manage guest_register" ON public.guest_register
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public check availability" ON public.guest_register;
CREATE POLICY "Public check availability" ON public.guest_register
    FOR SELECT TO anon
    USING (is_cancelled IS NOT TRUE);

DROP POLICY IF EXISTS "Public insert bookings" ON public.guest_register;
CREATE POLICY "Public insert bookings" ON public.guest_register
    FOR INSERT TO anon
    WITH CHECK (true);

-- Financials: Strictly authenticated
DROP POLICY IF EXISTS "Staff manage payment_history" ON public.payment_history;
CREATE POLICY "Staff manage payment_history" ON public.payment_history
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses;
CREATE POLICY "Staff manage expenses" ON public.expenses
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage OD account" ON public.uhhs_od_account;
CREATE POLICY "Staff manage OD account" ON public.uhhs_od_account
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage account_transactions" ON public.account_transactions;
CREATE POLICY "Staff manage account_transactions" ON public.account_transactions
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage company_advances" ON public.company_advances;
CREATE POLICY "Staff manage company_advances" ON public.company_advances
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- STEP 4: PREVENT PRIVILEGE ESCALATION ON PROFILES
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff read profiles" ON public.profiles;
CREATE POLICY "Staff read profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
            AND p.role IN ('admin', 'owner', 'developer')
        )
    );

-- ─────────────────────────────────────────────────────────────────
-- STEP 5: PUBLIC WEBPAGE ACCESS (MARKETING HOMEPAGE & REVIEWS)
-- ─────────────────────────────────────────────────────────────────
GRANT SELECT ON TABLE public.rooms TO anon, authenticated;
GRANT SELECT ON TABLE public.property_rates TO anon, authenticated;
GRANT SELECT ON TABLE public.property_reviews TO anon, authenticated;
GRANT INSERT ON TABLE public.leads TO anon, authenticated;
GRANT INSERT ON TABLE public.booking_requests TO anon, authenticated;
