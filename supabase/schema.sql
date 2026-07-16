-- ============================================================
-- COURIER APP — SUPABASE SCHEMA
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

-- 1. PROFILES ------------------------------------------------
-- Extends auth.users with app-specific data & role.
create type user_role as enum ('customer', 'rider', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  role user_role not null default 'customer',
  -- rider-specific fields
  vehicle_type text,
  is_online boolean default false,
  current_lat double precision,
  current_lng double precision,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. ORDERS ----------------------------------------------------
create type order_status as enum (
  'pending',        -- created, awaiting rider assignment
  'assigned',        -- rider assigned
  'picked_up',       -- rider has the package
  'in_transit',
  'delivered',
  'cancelled'
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rider_id uuid references public.profiles(id) on delete set null,

  pickup_address text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,

  dropoff_address text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,

  package_size text default 'small', -- small/medium/large
  package_note text,
  recipient_name text,
  recipient_phone text,

  distance_km numeric(10,2),
  price numeric(10,2) not null default 0,
  payment_status text not null default 'unpaid', -- unpaid/paid/refunded
  status order_status not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

-- 3. ORDER TRACKING EVENTS --------------------------------------
-- Append-only log of status changes & rider location pings, used
-- to render the live tracking timeline + map trail.
create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status order_status,
  lat double precision,
  lng double precision,
  note text,
  created_at timestamptz not null default now()
);

alter table public.order_events enable row level security;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Helper: fetch role of currently authed user
create or replace function public.current_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- PROFILES policies
create policy "profiles: read own or admin" on public.profiles
  for select using (
    auth.uid() = id or public.current_role() = 'admin'
    or role = 'rider' -- customers can see basic rider info (name/vehicle) once assigned
  );

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- ORDERS policies
create policy "orders: customer sees own" on public.orders
  for select using (
    auth.uid() = customer_id
    or auth.uid() = rider_id
    or public.current_role() = 'admin'
  );

create policy "orders: customer creates own" on public.orders
  for insert with check (auth.uid() = customer_id);

create policy "orders: customer can cancel own pending order" on public.orders
  for update using (
    auth.uid() = customer_id or auth.uid() = rider_id or public.current_role() = 'admin'
  );

-- ORDER EVENTS policies
create policy "events: visible to order participants" on public.order_events
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or o.rider_id = auth.uid() or public.current_role() = 'admin')
    )
  );

create policy "events: rider/admin can insert" on public.order_events
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.rider_id = auth.uid() or public.current_role() = 'admin')
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_events;
alter publication supabase_realtime add table public.profiles;

-- ============================================================
-- CONVENIENCE VIEW: available riders (for admin/dispatch)
-- ============================================================
create or replace view public.available_riders as
  select id, full_name, vehicle_type, current_lat, current_lng
  from public.profiles
  where role = 'rider' and is_online = true;
