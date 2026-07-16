-- ============================================================
-- MIGRATION v5 — New roles: 'manager' (Firoz-type) and 'ca' (accountant)
-- Run in Supabase → SQL Editor → New query → paste → Run
-- ============================================================

-- ---------- MANAGER: booking write access + limited read (Dashboard, Reports,
--            Flats Status, Monthly Attendance Summary, Salary/Advance Tracker) ----------
create or replace function is_manager() returns boolean as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'manager');
$$ language sql security definer;

-- read access (view-only tables Firoz needs)
create policy "manager_read_rooms" on rooms for select using (is_manager());
create policy "manager_read_flats" on flats_status for select using (is_manager());
create policy "manager_read_guests" on guest_register for select using (is_manager());
create policy "manager_read_payments" on payment_history for select using (is_manager());
create policy "manager_read_salary" on salary_tracker for select using (is_manager());
create policy "manager_read_advance" on advance_tracker for select using (is_manager());
create policy "manager_read_employees" on employees for select using (is_manager());
create policy "manager_read_attendance" on attendance_log for select using (is_manager());

-- write access — ONLY for bookings (create/edit new booking + record payments + update flat status)
-- NOTE: no delete policy for manager anywhere — matches "delete sirf owner"
create policy "manager_write_guests" on guest_register for insert with check (is_manager());
create policy "manager_update_guests" on guest_register for update using (is_manager());
create policy "manager_write_payments" on payment_history for insert with check (is_manager());
create policy "manager_write_flats" on flats_status for insert with check (is_manager());
create policy "manager_update_flats" on flats_status for update using (is_manager());

-- ---------- CA (Accountant): ONLY Financial Summary data, nothing else ----------
create or replace function is_ca() returns boolean as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'ca');
$$ language sql security definer;

create policy "ca_read_guests" on guest_register for select using (is_ca());
create policy "ca_read_payments" on payment_history for select using (is_ca());
create policy "ca_read_expenses" on expenses for select using (is_ca());
