-- =========================================================
-- Fix UHHS-OD Table Row-Level Security (RLS) for Anon Client
-- Run this in Supabase SQL Editor
-- SAFE: Does NOT delete any data; allows client to save & view deposits
-- =========================================================

-- 1. Ensure table exists with all required columns
CREATE TABLE IF NOT EXISTS uhhs_od_account (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INFLOW', 'OUTFLOW')),
    payment_mode TEXT DEFAULT 'UPI' CHECK (payment_mode IN ('UPI', 'CASH', 'BANK', 'OTHER')),
    received_from TEXT,
    reference_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS and grant full policies to anon and authenticated roles
ALTER TABLE uhhs_od_account ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon manage OD" ON uhhs_od_account;
DROP POLICY IF EXISTS "Allow authenticated manage OD" ON uhhs_od_account;
DROP POLICY IF EXISTS "Allow public read OD" ON uhhs_od_account;

CREATE POLICY "Allow anon manage OD" ON uhhs_od_account
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated manage OD" ON uhhs_od_account
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
