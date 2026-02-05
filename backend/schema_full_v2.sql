-- FULL FIXED SCHEMA V2
-- WARNING: THIS WILL DELETE ALL EXISTING DATA to ensure a clean slate.
-- Run this in Supabase SQL Editor.

-- 1. Drop existing tables to avoid conflicts
DROP TABLE IF EXISTS public.rides;
DROP TABLE IF EXISTS public.profiles;

-- 2. Enable PostGIS
create extension if not exists postgis;

-- 3. Create Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  mobile text not null, -- Mobile is now mandatory
  full_name text,
  email text, -- Optional now
  user_type text check (user_type in ('user', 'partner', 'admin')),
  vehicle_details jsonb, -- Stores { model: 'Swift', plate: 'MH04...' }
  is_online boolean default false,
  current_location geography(POINT),
  partner_unique_id text unique, -- 12-digit ID for partners
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable RLS on Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 5. Create Rides Table
create table public.rides (
  id uuid default uuid_generate_v4() primary key,
  rider_id uuid references public.profiles(id) not null,
  driver_id uuid references public.profiles(id),
  pickup_lat float not null,
  pickup_lng float not null,
  drop_lat float not null,
  drop_lng float not null,
  pickup_address text,
  drop_address text,
  status text check (status in ('requested', 'accepted', 'ongoing', 'completed', 'cancelled')) default 'requested',
  fare float,
  distance_km float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Enable RLS on Rides
alter table public.rides enable row level security;

create policy "Riders can see their own rides." on public.rides
  for select using (auth.uid() = rider_id);

create policy "Drivers can see available rides." on public.rides
  for select using (status = 'requested' or driver_id = auth.uid());

create policy "Riders can create rides." on public.rides
  for insert with check (auth.uid() = rider_id);

create policy "Drivers can update rides (accept/complete)." on public.rides
  for update using (true);

-- 7. RPC function for finding nearest drivers
create or replace function get_nearest_drivers(
  lat float,
  lng float,
  radius_meters float
)
returns table (
  id uuid,
  full_name text,
  lat float,
  lng float,
  dist_meters float
)
language sql
as $$
  select
    id,
    full_name,
    st_y(current_location::geometry) as lat,
    st_x(current_location::geometry) as lng,
    st_distance(current_location, st_point(lng, lat)::geography) as dist_meters
  from public.profiles
  where
    user_type = 'partner'
    and is_online = true
    and st_dwithin(current_location, st_point(lng, lat)::geography, radius_meters)
  order by dist_meters asc;
$$;
