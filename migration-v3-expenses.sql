-- ============================================================
-- MIGRATION v3 — Expense Tracking (for Income − Expense = Profit)
-- Run in Supabase → SQL Editor → New query → paste → Run
-- Safe: only adds new tables, does not touch existing data
-- ============================================================

create table if not exists expense_categories (
  category_id text primary key,
  category_name text not null,       -- e.g. "Staff Quarters Rent", "Electricity", "Internet"
  default_monthly_amount numeric,    -- suggested amount (roughly same every month)
  notes text
);

create table if not exists expenses (
  id bigserial primary key,
  category_id text references expense_categories(category_id),
  month text,                        -- e.g. 'Jul-2026'
  amount numeric default 0,
  entry_date date default current_date,
  notes text
);

alter table expense_categories enable row level security;
alter table expenses enable row level security;

create policy "owner_full_expense_categories" on expense_categories for all using (is_owner());
create policy "owner_full_expenses" on expenses for all using (is_owner());
create policy "viewer_read_expense_categories" on expense_categories for select using (is_owner_or_viewer());
create policy "viewer_read_expenses" on expenses for select using (is_owner_or_viewer());
