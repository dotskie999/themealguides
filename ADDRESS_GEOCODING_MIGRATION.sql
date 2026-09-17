create table if not exists public.location_cache (
  cache_key text primary key,
  city text not null,
  barangay text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  display_name text,
  updated_at timestamptz not null default now()
);

alter table public.location_cache enable row level security;
revoke all on table public.location_cache from anon, authenticated;
grant all on table public.location_cache to service_role;

alter table public.guests
  add column if not exists location_source text;

alter table public.orders
  add column if not exists location_source text;
