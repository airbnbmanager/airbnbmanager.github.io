-- Adds claim-tracking columns to advance_tracker so Claims Manager
-- can mark staff advances as Claimed / Received, same as maintenance_log
-- and laundry_payments already support.
ALTER TABLE advance_tracker
  ADD COLUMN IF NOT EXISTS claim_status TEXT,
  ADD COLUMN IF NOT EXISTS claim_date DATE;
