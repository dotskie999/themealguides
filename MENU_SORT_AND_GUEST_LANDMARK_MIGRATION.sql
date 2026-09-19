-- Run this once in Supabase > SQL Editor before using menu item sorting
-- and saved guest landmarks in the admin/storefront.

alter table public.menu_items
  add column if not exists sort_order integer not null default 0;

create index if not exists menu_items_category_sort_idx
  on public.menu_items (category_id, sort_order, name);

alter table public.guests
  add column if not exists landmark text;
