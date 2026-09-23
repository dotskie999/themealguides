-- Run once in Supabase > SQL Editor to enable temporary-password enforcement.

alter table public.admin_profiles
  add column if not exists must_change_password boolean not null default false;

