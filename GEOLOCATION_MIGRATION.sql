alter table public.restaurants
  add column if not exists address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists delivery_radius_km numeric(6, 2) not null default 10
    check (delivery_radius_km > 0);

alter table public.guests
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_accuracy double precision;

alter table public.orders
  add column if not exists delivery_latitude double precision,
  add column if not exists delivery_longitude double precision,
  add column if not exists distance_km numeric(8, 2);

alter table public.restaurants
  drop constraint if exists restaurants_latitude_check,
  drop constraint if exists restaurants_longitude_check;

alter table public.restaurants
  add constraint restaurants_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint restaurants_longitude_check
    check (longitude is null or longitude between -180 and 180);

alter table public.guests
  drop constraint if exists guests_latitude_check,
  drop constraint if exists guests_longitude_check;

alter table public.guests
  add constraint guests_latitude_check
    check (latitude is null or latitude between -90 and 90),
  add constraint guests_longitude_check
    check (longitude is null or longitude between -180 and 180);
