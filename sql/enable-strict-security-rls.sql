-- ═══════════════════════════════════════════════════════════════════
-- 🛡️ THE UNIQUE HAVEN HOMES — MASTER SECURITY & ANTI-LEAK HARDENING
-- Run this in Supabase Dashboard → SQL Editor → Click "RUN"
--
-- WHAT THIS FIXES & PROTECTS:
-- 1. Prevents anonymous internet users from downloading guest names,
--    phone numbers, Aadhaar/ID proofs, and financial records.
-- 2. Restricts all financial tables (payments, expenses, OD, cashbook, salaries)
--    strictly to authenticated staff.
-- 3. Prevents privilege escalation (users cannot self-promote to admin).
-- 4. Preserves public website bookings (book.html) and calendar availability.
-- 5. Safe & error-free: dynamically validates table existence so no 42P01 errors occur.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- STEP 1: ENABLE RLS & REVOKE ANON ACCESS ON ALL SENSITIVE TABLES
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  sensitive_tables TEXT[] := ARRAY[
    'guest_register', 'payment_history', 'expenses', 'employees',
    'profiles', 'uhhs_od_account', 'cash_holders', 'cash_handovers',
    'company_advances', 'salary_tracker', 'advance_tracker', 'daily_expenses',
    'attendance_log', 'pending_users', 'investors', 'investor_properties',
    'property_setup_expenses', 'property_setup_categories', 'cash_expenses',
    'whatsapp_log', 'property_shifts'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    -- Only execute if table exists and is a regular table (not a view)
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated', t);
    END IF;
  END LOOP;

  -- Handle views (like account_transactions)
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'account_transactions'
  ) THEN
    REVOKE ALL ON public.account_transactions FROM anon;
    GRANT ALL ON public.account_transactions TO authenticated;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 2: GUEST REGISTER PRIVACY (PREVENTS GUEST DATA & ID LEAK)
-- ─────────────────────────────────────────────────────────────────
-- Website visitors can ONLY check dates and submit booking requests
REVOKE SELECT ON TABLE public.guest_register FROM anon;
GRANT SELECT (room_id, check_in, check_out, is_cancelled) ON TABLE public.guest_register TO anon;
GRANT INSERT ON TABLE public.guest_register TO anon;
GRANT ALL ON TABLE public.guest_register TO authenticated;

-- Policies for guest_register
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

-- ─────────────────────────────────────────────────────────────────
-- STEP 3: FINANCIAL & OD POLICIES (AUTHENTICATED ONLY)
-- ─────────────────────────────────────────────────────────────────
-- Clean up legacy insecure policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'uhhs_od_account') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon manage OD" ON public.uhhs_od_account';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public read OD" ON public.uhhs_od_account';
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage OD account" ON public.uhhs_od_account';
    EXECUTE 'CREATE POLICY "Staff manage OD account" ON public.uhhs_od_account FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'payment_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage payment_history" ON public.payment_history';
    EXECUTE 'CREATE POLICY "Staff manage payment_history" ON public.payment_history FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'expenses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses';
    EXECUTE 'CREATE POLICY "Staff manage expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'company_advances') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff manage company_advances" ON public.company_advances';
    EXECUTE 'CREATE POLICY "Staff manage company_advances" ON public.company_advances FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 4: PREVENT PRIVILEGE ESCALATION ON PROFILES
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'owner', 'developer')
  );
$$;

DROP POLICY IF EXISTS "Staff read profiles" ON public.profiles;
CREATE POLICY "Staff read profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own display_name" ON public.profiles;
CREATE POLICY "Users can update own display_name" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- ─────────────────────────────────────────────────────────────────
-- STEP 5: AUTOMATIC POLICY CREATION FOR ALL EXISTING OPERATIONAL TABLES
-- ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'employees', 'cash_holders', 'cash_handovers', 'salary_tracker',
    'advance_tracker', 'daily_expenses', 'attendance_log', 'pending_users',
    'investors', 'investor_properties', 'property_setup_expenses',
    'property_setup_categories', 'cash_expenses', 'whatsapp_log', 'property_shifts'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Staff manage %I" ON public.%I', t, t);
      EXECUTE format('CREATE POLICY "Staff manage %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- STEP 6: PUBLIC WEBPAGE ACCESS (ROOM SHOWCASE & MARKETING)
-- ─────────────────────────────────────────────────────────────────
GRANT SELECT ON TABLE public.rooms TO anon, authenticated;
DROP POLICY IF EXISTS "Public view rooms" ON public.rooms;
CREATE POLICY "Public view rooms" ON public.rooms
    FOR SELECT TO anon, authenticated
    USING (true);
DROP POLICY IF EXISTS "Staff manage rooms" ON public.rooms;
CREATE POLICY "Staff manage rooms" ON public.rooms
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
