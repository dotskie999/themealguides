-- Consolidate the original Accra and Tema launch markets into one Greater Accra market.
-- Safe to run more than once after MULTI_MARKET_MIGRATION.sql.

begin;

alter table public.restaurants drop constraint if exists restaurants_market_code_check;
alter table public.guests drop constraint if exists guests_market_code_check;
alter table public.orders drop constraint if exists orders_market_code_check;

update public.restaurants
set market_code = 'gh-greater-accra'
where market_code in ('gh-accra', 'gh-tema');

update public.guests
set market_code = 'gh-greater-accra'
where market_code in ('gh-accra', 'gh-tema');

update public.orders
set market_code = 'gh-greater-accra'
where market_code in ('gh-accra', 'gh-tema');

alter table public.restaurants add constraint restaurants_market_code_check
  check (market_code in ('ph-ncr', 'gh-greater-accra'));
alter table public.guests add constraint guests_market_code_check
  check (market_code in ('ph-ncr', 'gh-greater-accra'));
alter table public.orders add constraint orders_market_code_check
  check (market_code in ('ph-ncr', 'gh-greater-accra'));

commit;
