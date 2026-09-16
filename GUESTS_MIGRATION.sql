create table if not exists public.guests (
  guest_id uuid primary key,
  customer_name text not null,
  customer_email text not null,
  contact_number text not null,
  city text not null,
  barangay text not null,
  house_number text not null,
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  consent_at timestamptz not null,
  first_visited_at timestamptz not null default now(),
  last_visited_at timestamptz not null default now(),
  visit_count integer not null default 1 check (visit_count > 0)
);

create index if not exists guests_last_visited_idx
  on public.guests (last_visited_at desc);

alter table public.guests enable row level security;
revoke all on table public.guests from anon, authenticated;
grant all on table public.guests to service_role;
