-- Security Deposit Migration for guest_register
-- Run this in Supabase SQL Editor
-- SAFE: Adds optional columns with defaults; no existing data is changed or deleted.

ALTER TABLE guest_register
ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_status TEXT DEFAULT 'none', -- 'none', 'pending', 'collected', 'refunded', 'partially_refunded', 'retained'
ADD COLUMN IF NOT EXISTS security_deposit_mode TEXT, -- 'Cash', 'UPI', 'Bank'
ADD COLUMN IF NOT EXISTS security_deposit_received_by TEXT,
ADD COLUMN IF NOT EXISTS security_deposit_received_date DATE,
ADD COLUMN IF NOT EXISTS security_deposit_refund_date DATE,
ADD COLUMN IF NOT EXISTS security_deposit_refund_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_refund_mode TEXT, -- 'UPI', 'Cash', 'Bank'
ADD COLUMN IF NOT EXISTS security_deposit_refunded_by TEXT,
ADD COLUMN IF NOT EXISTS security_deposit_deducted_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_deduction_reason TEXT,
ADD COLUMN IF NOT EXISTS security_deposit_notes TEXT;

-- Helpful comment
COMMENT ON COLUMN guest_register.security_deposit_amount IS 'Refundable security deposit amount taken from guest. Strictly isolated from stay rental revenue.';
COMMENT ON COLUMN guest_register.security_deposit_status IS 'none | pending | collected | refunded | partially_refunded | retained';
COMMENT ON COLUMN guest_register.security_deposit_deducted_amount IS 'Amount deducted from deposit for property damage, violations, or unpaid dues.';
