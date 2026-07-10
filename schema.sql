-- ============================================================
-- Airbnb Management — Supabase (Postgres) schema
-- Mirrors the Excel workbook structure: Master tables + transactional tables
-- Run this in Supabase: Project → SQL Editor → New query → paste → Run
-- ============================================================

-- ---------- MASTER TABLES ----------

create table rooms (
  room_id text primary key,
  room_no text not null,
  address text,
  room_type text,             -- e.g. Blue, Green, Red, Cherry
  rent_per_night numeric,
  max_guests int,
  bookable boolean default true,   -- false = permanently out of service
  notes text
);

create table employees (
  emp_id text primary key,
  name text not null,
  phone text,
  role text,
  assigned_rooms text,
  joining_date date,
  monthly_salary numeric,
  status text default 'Active',    -- Active / Inactive
  notes text
);

-- links a login (Supabase Auth user) to an owner or a specific employee
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'employee',   -- 'owner' or 'employee'
  emp_id text references employees(emp_id)
);

-- ---------- TRANSACTIONAL TABLES ----------

create table flats_status (
  room_id text primary key references rooms(room_id),
  status text default 'Free',           -- Free / Booked / Blocked-Maintenance
  cleaning_status text default 'Clean', -- Clean / Dirty / In Progress
  issue text,
  last_cleaned date,
  notes text
);

create table employee_tasks (
  id bigserial primary key,
  emp_id text references employees(emp_id),
  task_description text,
  assigned_date date default current_date,
  status text default 'Pending',   -- Pending / In Progress / Completed
  notes text
);

create table attendance_log (
  id bigserial primary key,
  att_date date not null default current_date,
  emp_id text references employees(emp_id),
  status text,       -- Present / Absent / Half Day / Paid Leave / Unpaid Leave
  notes text
);

create table salary_tracker (
  id bigserial primary key,
  emp_id text references employees(emp_id),
  month text,         -- e.g. 'Jul-2026'
  salary_due numeric default 0,
  salary_paid numeric default 0,
  payment_date date,
  payment_mode text,
  notes text
);

create table advance_tracker (
  id bigserial primary key,
  emp_id text references employees(emp_id),
  date_given date default current_date,
  advance_amount numeric default 0,
  reason text,
  repaid_amount numeric default 0,
  notes text
);

create table guest_register (
  booking_id text primary key,
  guest_name text,
  phone text,
  id_proof text,
  room_id text references rooms(room_id),
  check_in date,
  check_out date,
  guests int,
  total_amount numeric default 0,
  advance_paid numeric default 0,
  payment_status text,   -- Paid / Partial / Unpaid
  notes text
);

-- ============================================================
-- ROW LEVEL SECURITY — owner sees everything, employee sees only their own
-- ============================================================

alter table rooms enable row level security;
alter table employees enable row level security;
alter table profiles enable row level security;
alter table flats_status enable row level security;
alter table employee_tasks enable row level security;
alter table attendance_log enable row level security;
alter table salary_tracker enable row level security;
alter table advance_tracker enable row level security;
alter table guest_register enable row level security;

-- helper: is the logged-in user the owner?
create or replace function is_owner() returns boolean as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'owner');
$$ language sql security definer;

-- OWNER: full access to everything
create policy "owner_full_rooms" on rooms for all using (is_owner());
create policy "owner_full_employees" on employees for all using (is_owner());
create policy "owner_full_flats" on flats_status for all using (is_owner());
create policy "owner_full_tasks" on employee_tasks for all using (is_owner());
create policy "owner_full_attendance" on attendance_log for all using (is_owner());
create policy "owner_full_salary" on salary_tracker for all using (is_owner());
create policy "owner_full_advance" on advance_tracker for all using (is_owner());
create policy "owner_full_guests" on guest_register for all using (is_owner());
create policy "owner_full_profiles" on profiles for all using (is_owner());

-- EMPLOYEE: can only see rows tied to their own emp_id
create policy "emp_own_tasks" on employee_tasks for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_attendance" on attendance_log for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_salary" on salary_tracker for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_advance" on advance_tracker for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_profile" on employees for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_row" on profiles for select
  using (user_id = auth.uid());
