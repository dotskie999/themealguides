-- Run once in Supabase > SQL Editor before assigning Ghana restaurants.
-- Existing records remain in the Philippines / Metro Manila market.

alter table public.restaurants
  add column if not exists market_code text not null default 'ph-ncr',
  add column if not exists sort_order integer not null default 0;

alter table public.guests
  add column if not exists market_code text not null default 'ph-ncr',
  add column if not exists country_code text not null default 'PH',
  add column if not exists digital_address text;

alter table public.orders
  add column if not exists market_code text not null default 'ph-ncr',
  add column if not exists country_code text not null default 'PH',
  add column if not exists currency_code text not null default 'PHP',
  add column if not exists digital_address text;

create index if not exists restaurants_market_active_idx
  on public.restaurants (market_code, active, name);

create index if not exists restaurants_market_sort_idx
  on public.restaurants (market_code, sort_order, name);

create index if not exists guests_market_last_visited_idx
  on public.guests (market_code, last_visited_at desc);

create index if not exists orders_market_timestamp_idx
  on public.orders (market_code, timestamp desc);

alter table public.restaurants drop constraint if exists restaurants_market_code_check;
alter table public.restaurants add constraint restaurants_market_code_check
  check (market_code in ('ph-ncr', 'gh-accra', 'gh-tema'));

alter table public.guests drop constraint if exists guests_market_code_check;
alter table public.guests add constraint guests_market_code_check
  check (market_code in ('ph-ncr', 'gh-accra', 'gh-tema'));

alter table public.orders drop constraint if exists orders_market_code_check;
alter table public.orders add constraint orders_market_code_check
  check (market_code in ('ph-ncr', 'gh-accra', 'gh-tema'));
