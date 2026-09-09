-- UHHS-OD Payment Source Migration
-- Run this in Supabase SQL Editor
-- SAFE: Only adds columns, no data deletion

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cashbook') THEN
        ALTER TABLE cashbook ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance') THEN
        ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'laundry') THEN
        ALTER TABLE laundry ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_advances') THEN
        ALTER TABLE employee_advances ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reimbursements') THEN
        ALTER TABLE reimbursements ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claims') THEN
        ALTER TABLE claims ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_advances') THEN
        ALTER TABLE company_advances ADD COLUMN IF NOT EXISTS payment_source TEXT DEFAULT 'COMPANY';
    END IF;
END $$;

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

ALTER TABLE uhhs_od_account ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated manage OD" ON uhhs_od_account FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE VIEW uhhs_od_balance_view AS
SELECT
    COALESCE(SUM(CASE WHEN transaction_type = 'INFLOW' THEN amount ELSE 0 END), 0) AS total_inflow,
    COALESCE(SUM(CASE WHEN transaction_type = 'OUTFLOW' THEN amount ELSE 0 END), 0) AS total_outflow,
    COALESCE(SUM(CASE WHEN transaction_type = 'INFLOW' THEN amount ELSE -amount END), 0) AS net_balance
FROM uhhs_od_account;
