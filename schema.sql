-- ============================================================
-- FRESH SCHEMA — The Unique Haven Homes Pvt Ltd
-- This DROPS all existing tables/data and rebuilds everything cleanly.
-- Run in Supabase → SQL Editor → New query → paste ALL → Run
-- ============================================================

-- ---------- 0. CLEAN SLATE ----------
drop table if exists investor_properties cascade;
drop table if exists investors cascade;
drop table if exists stock_transactions cascade;
drop table if exists store_items cascade;
drop table if exists payment_history cascade;
drop table if exists guest_register cascade;
drop table if exists advance_tracker cascade;
drop table if exists salary_tracker cascade;
drop table if exists attendance_log cascade;
drop table if exists employee_tasks cascade;
drop table if exists flats_status cascade;
drop table if exists profiles cascade;
drop table if exists rooms cascade;
drop table if exists employees cascade;

drop function if exists is_owner() cascade;
drop function if exists is_owner_or_viewer() cascade;
drop function if exists investor_room_ids() cascade;

-- ============================================================
-- 1. MASTER TABLES
-- ============================================================

create table employees (
  emp_id text primary key,
  name text not null,
  phone text,
  role text,
  assigned_rooms text,
  joining_date date,
  monthly_salary numeric,
  status text default 'Active',
  notes text
);

create table investors (
  investor_id text primary key,
  name text not null,
  phone text,
  notes text
);

create table rooms (
  room_id text primary key,
  property_name text,
  address text,
  unit_type text,             -- Flat / Villa
  unit_no text not null,      -- FLAT101 / Villa (One)
  floor text,                 -- 1st / 2nd / ALL
  nickname text,              -- Red Rose, Black Beauty ...
  rent_per_night numeric,
  max_guests int,
  mode text default 'On',     -- On/Off (listed for rent or not)
  bookable boolean default true,  -- false = permanently out of service
  notes text
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'employee',   -- owner / viewer / employee / investor
  emp_id text references employees(emp_id),
  investor_id text references investors(investor_id),
  display_name text
);

-- ============================================================
-- 2. TRANSACTIONAL TABLES
-- ============================================================

create table flats_status (
  room_id text primary key references rooms(room_id),
  status text default 'Free',
  cleaning_status text default 'Clean',
  issue text,
  last_cleaned date,
  notes text
);

create table employee_tasks (
  id bigserial primary key,
  emp_id text references employees(emp_id),
  task_description text,
  assigned_date date default current_date,
  status text default 'Pending',
  notes text
);

create table attendance_log (
  id bigserial primary key,
  att_date date not null default current_date,
  emp_id text references employees(emp_id),
  status text,
  notes text
);

create table salary_tracker (
  id bigserial primary key,
  emp_id text references employees(emp_id),
  month text,
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
  id_proof_type text,            -- Aadhar / PAN / DL / Passport
  id_proof_no text,
  id_proof_photo_path text,       -- path in Supabase Storage
  room_id text references rooms(room_id),
  booking_mode text default 'Offline',  -- Online-Airbnb / Offline
  gross_amount numeric,           -- what guest paid (Online only)
  platform_fee numeric default 0, -- Airbnb commission (Online only)
  check_in date,
  check_out date,
  guests int,
  total_amount numeric default 0,
  payment_status text,            -- Paid / Partial / Unpaid
  notes text
);

create table payment_history (
  id bigserial primary key,
  booking_id text references guest_register(booking_id) on delete cascade,
  amount numeric not null,
  payment_date date default current_date,
  paid_at timestamptz default now(),
  payment_mode text,
  notes text
);

create table store_items (
  item_id text primary key,
  item_name text not null,
  category text,
  unit text,
  reorder_level numeric default 0,
  notes text
);

create table stock_transactions (
  id bigserial primary key,
  item_id text references store_items(item_id),
  room_id text references rooms(room_id),
  txn_type text,          -- In / Out
  quantity numeric,
  cost numeric,
  txn_date date default current_date,
  notes text
);

create table investor_properties (
  investor_id text references investors(investor_id),
  room_id text references rooms(room_id),
  primary key (investor_id, room_id)
);

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

alter table employees enable row level security;
alter table investors enable row level security;
alter table rooms enable row level security;
alter table profiles enable row level security;
alter table flats_status enable row level security;
alter table employee_tasks enable row level security;
alter table attendance_log enable row level security;
alter table salary_tracker enable row level security;
alter table advance_tracker enable row level security;
alter table guest_register enable row level security;
alter table payment_history enable row level security;
alter table store_items enable row level security;
alter table stock_transactions enable row level security;
alter table investor_properties enable row level security;

-- ---------- helper functions (created BEFORE policies that use them) ----------
create or replace function is_owner() returns boolean as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'owner');
$$ language sql security definer;

create or replace function is_owner_or_viewer() returns boolean as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role in ('owner','viewer'));
$$ language sql security definer;

create or replace function investor_room_ids() returns setof text as $$
  select room_id from investor_properties
  where investor_id = (select investor_id from profiles where user_id = auth.uid());
$$ language sql security definer;

-- ---------- OWNER: full access everywhere ----------
create policy "owner_full_employees" on employees for all using (is_owner());
create policy "owner_full_investors" on investors for all using (is_owner());
create policy "owner_full_rooms" on rooms for all using (is_owner());
create policy "owner_full_profiles" on profiles for all using (is_owner());
create policy "owner_full_flats" on flats_status for all using (is_owner());
create policy "owner_full_tasks" on employee_tasks for all using (is_owner());
create policy "owner_full_attendance" on attendance_log for all using (is_owner());
create policy "owner_full_salary" on salary_tracker for all using (is_owner());
create policy "owner_full_advance" on advance_tracker for all using (is_owner());
create policy "owner_full_guests" on guest_register for all using (is_owner());
create policy "owner_full_payments" on payment_history for all using (is_owner());
create policy "owner_full_store_items" on store_items for all using (is_owner());
create policy "owner_full_stock_txn" on stock_transactions for all using (is_owner());
create policy "owner_full_investor_properties" on investor_properties for all using (is_owner());

-- ---------- VIEWER (Boss): read-only on the core operational tables ----------
create policy "viewer_read_rooms" on rooms for select using (is_owner_or_viewer());
create policy "viewer_read_employees" on employees for select using (is_owner_or_viewer());
create policy "viewer_read_flats" on flats_status for select using (is_owner_or_viewer());
create policy "viewer_read_tasks" on employee_tasks for select using (is_owner_or_viewer());
create policy "viewer_read_attendance" on attendance_log for select using (is_owner_or_viewer());
create policy "viewer_read_salary" on salary_tracker for select using (is_owner_or_viewer());
create policy "viewer_read_advance" on advance_tracker for select using (is_owner_or_viewer());
create policy "viewer_read_guests" on guest_register for select using (is_owner_or_viewer());
create policy "viewer_read_payments" on payment_history for select using (is_owner_or_viewer());

-- ---------- EMPLOYEE: only their own rows ----------
create policy "emp_own_profile" on employees for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_tasks" on employee_tasks for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_attendance" on attendance_log for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_salary" on salary_tracker for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_advance" on advance_tracker for select
  using (emp_id = (select emp_id from profiles where user_id = auth.uid()));
create policy "emp_own_row" on profiles for select
  using (user_id = auth.uid());

-- ---------- INVESTOR: only their own linked properties ----------
create policy "investor_read_own_rooms" on rooms for select
  using (room_id in (select investor_room_ids()));
create policy "investor_read_own_bookings" on guest_register for select
  using (room_id in (select investor_room_ids()));
create policy "investor_read_own_payments" on payment_history for select
  using (booking_id in (select booking_id from guest_register where room_id in (select investor_room_ids())));
create policy "investor_own_row" on profiles for select
  using (user_id = auth.uid());

-- ============================================================
-- 4. STORAGE: private bucket for ID proof photos (Owner-only)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', false)
on conflict (id) do nothing;

drop policy if exists "owner_manage_id_proofs" on storage.objects;
create policy "owner_manage_id_proofs" on storage.objects for all
  using (bucket_id = 'id-proofs' and is_owner());

-- ============================================================
-- 5. SEED DATA — your 13 properties
-- ============================================================
insert into rooms (room_id, property_name, address, unit_type, unit_no, floor, nickname, rent_per_night, max_guests, mode, bookable, notes) values
('GOM-101','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT101','1st','Red Rose',null,8,'On',true,null),
('GOM-102','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT102','1st','Black Beauty',null,null,'On',true,null),
('GOM-201','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT201','2nd','Dark Blue',null,null,'On',true,null),
('GOM-202','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT202','2nd','The Brown',null,null,'On',true,null),
('GOM-301','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT301','3rd','The Light Green',null,null,'On',true,null),
('GOM-302','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT302','3rd','The Unique',null,null,'On',true,null),
('GOM-401','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT401','4th','The Nawab Stay',null,null,'On',true,null),
('GOM-501','Vikalp Khand','Vikalp Khand Gomtinagar Chinhat','Flat','FLAT501','5th','Blue Pent House',null,null,'On',true,null),
('VIL-101','Geetapuri Colony','Geetapuri Colony','Villa','Villa (One)','ALL','Gomti Grand Villa',null,null,'On',true,null),
('VIL-102','Omax City','Omax City','Villa','Villa (One)','ALL','Royal White House',null,null,'On',true,null),
('VIL-103','Vishesh Khand','3/64 Vishesh Khand 3 Gomtinagar','Villa','Villa (One)','ALL','The Pink House',null,null,'On',true,null),
('VIL-104','Vishesh Khand','3/64 Vishesh Khand 3 Gomtinagar','Villa','Villa (One)','ALL','The Green House',null,null,'On',true,null),
('VIL-105','Vishesh Khand','3/64 Vishesh Khand 3 Gomtinagar','Villa','Villa (One)','ALL','The Yellow House',null,null,'On',true,null);

insert into flats_status (room_id, status, cleaning_status)
select room_id, 'Free', 'Clean' from rooms;

-- ============================================================
-- Done! Next steps (run these AFTER creating your owner login again):
--
-- 1. Authentication → Users → Add user (your owner email/password)
-- 2. Copy that user's UID, then run:
--    insert into profiles (user_id, role, display_name)
--    values ('PASTE-UID-HERE', 'owner', 'Praveen (Owner)');
-- ============================================================