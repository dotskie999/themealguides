-- Run once in Supabase > SQL Editor before accepting delivery-fee orders.

create table if not exists public.delivery_settings (
  market_code text primary key,
  base_distance_km numeric(6,2) not null default 2.20,
  base_fare numeric(10,2) not null default 38.00,
  additional_per_km numeric(10,2) not null default 6.00,
  max_internal_distance_km numeric(6,2) not null default 7.20,
  peak_surcharge numeric(10,2) not null default 25.00,
  lunch_peak_start time not null default '11:00',
  lunch_peak_end time not null default '13:30',
  dinner_peak_start time not null default '17:00',
  dinner_peak_end time not null default '20:30',
  storm_surcharge numeric(10,2) not null default 30.00,
  storm_active boolean not null default false,
  timezone text not null default 'Asia/Manila',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.delivery_settings (market_code) values ('ph-ncr') on conflict (market_code) do nothing;
alter table public.delivery_settings enable row level security;

alter table public.orders
  add column if not exists fulfillment_type text not null default 'doorstep',
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists order_total numeric(10,2),
  add column if not exists delivery_provider text,
  add column if not exists delivery_fee_breakdown jsonb;

update public.orders set order_total = subtotal where order_total is null;
alter table public.orders alter column order_total set not null;

alter table public.orders drop constraint if exists orders_fulfillment_type_check;
alter table public.orders add constraint orders_fulfillment_type_check check (fulfillment_type in ('pickup','doorstep'));
