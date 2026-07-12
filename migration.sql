-- ============================================================
-- MIGRATION v2 — The Unique Haven Homes Pvt Ltd
-- Run in Supabase → SQL Editor → New query → paste ALL → Run
-- Safe: only ADDS/RENAMES columns and ADDS new tables.
-- Does NOT delete any existing data.
-- ============================================================

-- ---------- 1. ROOMS: proper property details ----------
alter table rooms rename column room_no to unit_no;
alter table rooms rename column room_type to nickname;      -- "Red Rose", "Black Beauty" etc.
alter table rooms add column if not exists property_name text;
alter table rooms add column if not exists unit_type text;   -- Flat / Villa
alter table rooms add column if not exists floor text;       -- 1st / 2nd / ALL
alter table rooms add column if not exists mode text default 'On';  -- On/Off (listed for rent or not)

-- ---------- 2. GUEST REGISTER: ID proof, photo, online/offline, commission ----------
alter table guest_register rename column id_proof to id_proof_no;
alter table guest_register add column if not exists id_proof_type text;       -- Aadhar/PAN/DL/Passport
alter table guest_register add column if not exists id_proof_photo_path text; -- path in Supabase Storage
alter table guest_register add column if not exists booking_mode text default 'Offline'; -- Online-Airbnb / Offline
alter table guest_register add column if not exists gross_amount numeric;    -- what guest paid (Online only)
alter table guest_register add column if not exists platform_fee numeric default 0; -- Airbnb's commission (Online only)

-- ---------- 3. PAYMENT HISTORY (every payment, timestamped — real-time accurate balance) ----------
create table if not exists payment_history (
  id bigserial primary key,
  booking_id text references guest_register(booking_id) on delete cascade,
  amount numeric not null,
  payment_date date default current_date,
  paid_at timestamptz default now(),
  payment_mode text,           -- Cash / UPI / Bank / Airbnb Payout
  notes text
);

-- migrate any existing advance_paid values into payment_history so no data is lost
insert into payment_history (booking_id, amount, payment_date, payment_mode, notes)
select booking_id, advance_paid, current_date, 'Migrated', 'Auto-migrated from old advance_paid field'
from guest_register
where advance_paid is not null and advance_paid > 0;

-- ---------- 4. STORE / INVENTORY ----------
create table if not exists store_items (
  item_id text primary key,
  item_name text not null,
  category text,        -- Linen / Toiletries / Cleaning / Electronics / Furniture / Other
  unit text,             -- pcs / kg / liter
  reorder_level numeric default 0,
  notes text
);

create table if not exists stock_transactions (
  id bigserial primary key,
  item_id text references store_items(item_id),
  room_id text references rooms(room_id),   -- which property (nullable = general stock)
  txn_type text,          -- In / Out
  quantity numeric,
  cost numeric,
  txn_date date default current_date,
  notes text
);

-- ---------- 5. INVESTORS (see only their own property's bookings) ----------
create table if not exists investors (
  investor_id text primary key,
  name text not null,
  phone text,
  notes text
);

create table if not exists investor_properties (
  investor_id text references investors(investor_id),
  room_id text references rooms(room_id),
  primary key (investor_id, room_id)
);

-- ---------- 6. PROFILES: display name + investor link ----------
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists investor_id text references investors(investor_id);

-- ============================================================
-- ROW LEVEL SECURITY for all new tables
-- ============================================================

alter table payment_history enable row level security;
alter table store_items enable row level security;
alter table stock_transactions enable row level security;
alter table investors enable row level security;
alter table investor_properties enable row level security;

-- OWNER: full access (uses existing is_owner() function)
create policy "owner_full_payment_history" on payment_history for all using (is_owner());
create policy "owner_full_store_items" on store_items for all using (is_owner());
create policy "owner_full_stock_txn" on stock_transactions for all using (is_owner());
create policy "owner_full_investors" on investors for all using (is_owner());
create policy "owner_full_investor_properties" on investor_properties for all using (is_owner());

-- VIEWER (Boss): read-only on the operational tables (kept simple — not store/investors)
create policy "viewer_read_payment_history" on payment_history for select using (is_owner_or_viewer());

-- INVESTOR: read-only, ONLY for their own linked properties
create or replace function investor_room_ids() returns setof text as $$
  select room_id from investor_properties
  where investor_id = (select investor_id from profiles where user_id = auth.uid());
$$ language sql security definer;

create policy "investor_read_own_rooms" on rooms for select
  using (room_id in (select investor_room_ids()));
create policy "investor_read_own_bookings" on guest_register for select
  using (room_id in (select investor_room_ids()));
create policy "investor_read_own_payments" on payment_history for select
  using (booking_id in (select booking_id from guest_register where room_id in (select investor_room_ids())));

-- ============================================================
-- STORAGE: private bucket for ID proof photos (Owner-only access)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('id-proofs', 'id-proofs', false)
on conflict (id) do nothing;

create policy "owner_manage_id_proofs" on storage.objects for all
  using (bucket_id = 'id-proofs' and is_owner());

-- ============================================================
-- SEED DATA: your 13 properties (Gomtinagar Chinhat + Villas)
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
('VIL-105','Vishesh Khand','3/64 Vishesh Khand 3 Gomtinagar','Villa','Villa (One)','ALL','The Yellow House',null,null,'On',true,null)
on conflict (room_id) do nothing;

-- give each new room a default "Free / Clean" live status row
insert into flats_status (room_id, status, cleaning_status)
select room_id, 'Free', 'Clean' from rooms
where room_id not in (select room_id from flats_status)
on conflict (room_id) do nothing;

-- ============================================================
-- Done. Next: set your own profiles.display_name, e.g.:
-- update profiles set display_name = 'Praveen (Owner)' where role = 'owner';
-- ============================================================
