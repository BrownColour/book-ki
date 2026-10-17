-- Book App - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Expenses table
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  date date not null default current_date,
  item text not null,
  amount numeric(10, 2) not null,
  category text not null default 'others',
  notes text,
  updated_at timestamptz default now()
);

-- Ledger accounts for H, S, L
create table if not exists ledger_accounts (
  id uuid default gen_random_uuid() primary key,
  person text not null unique check (person in ('H', 'S', 'L')),
  total_given numeric(10, 2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ledger transactions
create table if not exists ledger_transactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  date date not null default current_date,
  person text not null check (person in ('H', 'S', 'L')),
  amount numeric(10, 2) not null,
  note text,
  type text not null default 'given' check (type in ('given', 'returned')),
  updated_at timestamptz default now()
);

-- App settings
create table if not exists app_settings (
  id uuid default gen_random_uuid() primary key,
  key text not null unique,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Seed default ledger accounts
insert into ledger_accounts (person) values ('H'), ('S'), ('L')
on conflict (person) do nothing;

-- Seed default categories setting
insert into app_settings (key, value)
values ('categories', '["fruits", "vegetables", "others"]')
on conflict (key) do nothing;

-- Enable Row Level Security (set to allow all for single-user app)
alter table expenses enable row level security;
alter table ledger_accounts enable row level security;
alter table ledger_transactions enable row level security;
alter table app_settings enable row level security;

-- Allow all operations (single-user, no auth)
create policy "Allow all on expenses" on expenses for all using (true) with check (true);
create policy "Allow all on ledger_accounts" on ledger_accounts for all using (true) with check (true);
create policy "Allow all on ledger_transactions" on ledger_transactions for all using (true) with check (true);
create policy "Allow all on app_settings" on app_settings for all using (true) with check (true);

-- Trigger to update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger expenses_updated_at before update on expenses
  for each row execute function update_updated_at();

create trigger ledger_transactions_updated_at before update on ledger_transactions
  for each row execute function update_updated_at();

create trigger app_settings_updated_at before update on app_settings
  for each row execute function update_updated_at();
