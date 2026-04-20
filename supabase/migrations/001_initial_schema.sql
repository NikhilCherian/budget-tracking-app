-- ============================================================
-- Twospend – initial schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

create table households (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  currency        text not null default 'GBP',
  monthly_budget  numeric(12,2),
  created_at      timestamptz default now()
);

-- Extends auth.users; auto-created by trigger on signup
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid references households(id) on delete set null,
  display_name  text,
  email         text not null,
  avatar_color  text not null default '#6366f1',
  created_at    timestamptz default now()
);

create table household_invites (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  invited_by    uuid not null references profiles(id),
  invited_email text not null,
  token         text unique not null default encode(gen_random_bytes(24), 'hex'),
  accepted_at   timestamptz,
  created_at    timestamptz default now()
);

create table categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  icon          text not null default '💰',
  color         text not null default '#6366f1',
  monthly_limit numeric(12,2),
  is_default    boolean not null default false,
  created_at    timestamptz default now()
);

create table transactions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references profiles(id),
  category_id   uuid references categories(id) on delete set null,
  amount        numeric(12,2) not null check (amount > 0),
  currency      text not null default 'GBP',
  description   text not null,
  date          date not null,
  source        text not null default 'manual' check (source in ('manual','pdf_import')),
  notes         text,
  created_at    timestamptz default now()
);

create table budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  month         date not null,  -- always first day of month
  total_limit   numeric(12,2) not null check (total_limit > 0),
  created_at    timestamptz default now(),
  unique (household_id, month)
);

create table goals (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  name           text not null,
  target_amount  numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  deadline       date,
  icon           text not null default '🎯',
  color          text not null default '#10b981',
  created_at     timestamptz default now()
);

-- ── Indexes ─────────────────────────────────────────────────

create index transactions_household_date on transactions (household_id, date desc);
create index transactions_category on transactions (category_id);

-- ── Row Level Security ───────────────────────────────────────

alter table households         enable row level security;
alter table profiles           enable row level security;
alter table household_invites  enable row level security;
alter table categories         enable row level security;
alter table transactions       enable row level security;
alter table budgets            enable row level security;
alter table goals              enable row level security;

-- Helper: get the calling user's household_id without recursion
create or replace function get_my_household_id()
returns uuid
language sql stable security definer
as $$
  select household_id from profiles where id = auth.uid()
$$;

-- households
create policy "households: members can select"
  on households for select
  using (id = get_my_household_id());

create policy "households: anyone can create"
  on households for insert
  with check (true);

create policy "households: members can update"
  on households for update
  using (id = get_my_household_id());

-- profiles
create policy "profiles: own household can select"
  on profiles for select
  using (household_id = get_my_household_id() or id = auth.uid());

create policy "profiles: user creates own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "profiles: user updates own profile"
  on profiles for update
  using (id = auth.uid());

-- household_invites
create policy "invites: household members can select"
  on household_invites for select
  using (household_id = get_my_household_id());

create policy "invites: household members can insert"
  on household_invites for insert
  with check (household_id = get_my_household_id());

-- categories
create policy "categories: household select"
  on categories for select
  using (household_id = get_my_household_id());

create policy "categories: household insert"
  on categories for insert
  with check (household_id = get_my_household_id());

create policy "categories: household update"
  on categories for update
  using (household_id = get_my_household_id());

create policy "categories: household delete non-default"
  on categories for delete
  using (household_id = get_my_household_id() and is_default = false);

-- transactions
create policy "transactions: household select"
  on transactions for select
  using (household_id = get_my_household_id());

create policy "transactions: household insert"
  on transactions for insert
  with check (household_id = get_my_household_id() and user_id = auth.uid());

create policy "transactions: household update"
  on transactions for update
  using (household_id = get_my_household_id());

create policy "transactions: household delete"
  on transactions for delete
  using (household_id = get_my_household_id());

-- budgets
create policy "budgets: household select"
  on budgets for select
  using (household_id = get_my_household_id());

create policy "budgets: household insert"
  on budgets for insert
  with check (household_id = get_my_household_id());

create policy "budgets: household update"
  on budgets for update
  using (household_id = get_my_household_id());

-- goals
create policy "goals: household select"
  on goals for select
  using (household_id = get_my_household_id());

create policy "goals: household insert"
  on goals for insert
  with check (household_id = get_my_household_id());

create policy "goals: household update"
  on goals for update
  using (household_id = get_my_household_id());

create policy "goals: household delete"
  on goals for delete
  using (household_id = get_my_household_id());

-- ── Trigger: auto-create profile on signup ───────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Seed: default categories helper ─────────────────────────
-- Call this function after a household is created:
-- select seed_default_categories('<household_id>');

create or replace function seed_default_categories(p_household_id uuid)
returns void
language plpgsql security definer
as $$
begin
  insert into categories (household_id, name, icon, color, is_default) values
    (p_household_id, 'Rent / Mortgage', '🏠', '#ef4444', true),
    (p_household_id, 'Groceries',        '🛒', '#f97316', true),
    (p_household_id, 'Eating Out',       '🍽️', '#eab308', true),
    (p_household_id, 'Transport',        '🚌', '#3b82f6', true),
    (p_household_id, 'Health',           '💊', '#ec4899', true),
    (p_household_id, 'Entertainment',    '🎬', '#8b5cf6', true),
    (p_household_id, 'Subscriptions',    '📱', '#06b6d4', true),
    (p_household_id, 'Shopping',         '🛍️', '#10b981', true),
    (p_household_id, 'Utilities',        '💡', '#6366f1', true),
    (p_household_id, 'Other',            '💰', '#6b7280', true);
end;
$$;
