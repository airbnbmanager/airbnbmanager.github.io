-- ============================================================
-- MIGRATION v6 — Booked By tracking + Multi-ID support
-- Run in Supabase → SQL Editor → New query → paste → Run
-- ============================================================

alter table guest_register add column if not exists booked_by text;
alter table guest_register add column if not exists id_proof_photo_paths text; -- comma-separated paths for multiple guest IDs (max 8)
alter table expenses add column if not exists room_id text references rooms(room_id); -- null = general/company-wide expense
