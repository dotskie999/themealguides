-- Run once in Supabase > SQL Editor before enabling country-separated admin accounts.

alter table public.admin_profiles
  add column if not exists country_scope text;

-- Existing staff are assigned to the original Philippines deployment.
update public.admin_profiles
set country_scope = 'PH'
where country_scope is null;

alter table public.admin_profiles
  alter column country_scope set default 'PH',
  alter column country_scope set not null;

alter table public.admin_profiles
  drop constraint if exists admin_profiles_country_scope_check;

alter table public.admin_profiles
  add constraint admin_profiles_country_scope_check
  check (country_scope in ('PH', 'GH'));

create index if not exists admin_profiles_country_scope_idx
  on public.admin_profiles (country_scope, active);

alter table public.admin_activity_logs
  add column if not exists country_scope text;

update public.admin_activity_logs
set country_scope = 'PH'
where country_scope is null;

alter table public.admin_activity_logs
  alter column country_scope set default 'PH',
  alter column country_scope set not null;

alter table public.admin_activity_logs
  drop constraint if exists admin_activity_logs_country_scope_check;

alter table public.admin_activity_logs
  add constraint admin_activity_logs_country_scope_check
  check (country_scope in ('PH', 'GH'));

create index if not exists admin_activity_logs_country_scope_idx
  on public.admin_activity_logs (country_scope, created_at desc);
