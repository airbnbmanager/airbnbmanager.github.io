-- ============================================================
-- MIGRATION v4 — Owner (viewer role) gets full booking control
-- Add/Edit bookings, record payments, update flat status — but NOT delete
-- Run in Supabase → SQL Editor → New query → paste → Run
-- ============================================================

-- INSERT + UPDATE for viewer on guest_register (booking) — no DELETE
create policy "viewer_write_guests" on guest_register for insert
  with check (is_owner_or_viewer());
create policy "viewer_update_guests" on guest_register for update
  using (is_owner_or_viewer());

-- INSERT for viewer on payment_history (recording payments) — no UPDATE/DELETE
create policy "viewer_write_payments" on payment_history for insert
  with check (is_owner_or_viewer());

-- INSERT + UPDATE for viewer on flats_status (marking Free/Booked/Dirty)
create policy "viewer_write_flats" on flats_status for insert
  with check (is_owner_or_viewer());
create policy "viewer_update_flats" on flats_status for update
  using (is_owner_or_viewer());

-- Note: DELETE on guest_register/payment_history/flats_status is intentionally
-- left WITHOUT a viewer policy — only 'owner' role (via owner_full_* policies)
-- can delete. This matches: "Owner ko full control do, delete nahi."
