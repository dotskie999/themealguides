'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ChefHat, MapPin } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { distanceKm, formatDistance, formatTravelEstimate } from '@/lib/distance';
import { normalizeImageUrl } from '@/lib/images';
import { restaurantCity, restaurantSlug } from '@/lib/restaurant';
import { DEFAULT_MARKET, getMarket, normalizeMarketCode } from '@/lib/markets';

export default function RestaurantGrid({ restaurants }) {
  const { guest } = useGuest();
  const [expandedDescriptions,setExpandedDescriptions]=useState({});
  const marketCode=normalizeMarketCode(guest?.market_code||DEFAULT_MARKET);
  const rows = useMemo(() => restaurants.filter((restaurant)=>normalizeMarketCode(restaurant.market_code)===marketCode).map((restaurant) => ({
    ...restaurant,
    distance: distanceKm(guest?.latitude, guest?.longitude, restaurant.latitude, restaurant.longitude),
  })).sort((a, b) => {
    const aPosition = Number(a.sort_order) > 0 ? Number(a.sort_order) : Number.MAX_SAFE_INTEGER;
    const bPosition = Number(b.sort_order) > 0 ? Number(b.sort_order) : Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    if (a.distance === null && b.distance === null) return String(a.name || '').localeCompare(String(b.name || ''));
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance || String(a.name || '').localeCompare(String(b.name || ''));
  }), [guest?.latitude, guest?.longitude, marketCode, restaurants]);

  if(!rows.length) return <div className="state-card"><ChefHat size={34}/><h3>No kitchens are serving in {getMarket(marketCode).region} yet.</h3><p>This market is ready for testing. Assign a restaurant to it from the admin dashboard.</p></div>;

  return <div className="restaurant-grid">{rows.map((restaurant, index) => {
    const radius = Number(restaurant.delivery_radius_km || 0);
    const outside = restaurant.distance !== null && radius > 0 && restaurant.distance > radius;
    const city = restaurantCity(restaurant);
    const description=restaurant.description||'A fresh menu made for your cravings.';
    const isLong=description.length>105;
    const expanded=Boolean(expandedDescriptions[restaurant.restaurant_id]);
    const restaurantUrl=`/restaurant/${restaurantSlug(restaurant.name)}`;
    return <article className="restaurant-card" key={restaurant.restaurant_id}>
      <Link className="restaurant-card-cover" href={restaurantUrl} aria-label={`View ${restaurant.name} menu`}><div className="restaurant-art">{normalizeImageUrl(restaurant.logo_url) ? <Image src={normalizeImageUrl(restaurant.logo_url)} alt={`${restaurant.name} logo`} fill sizes="(max-width: 699px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 44px), 380px" priority={index < 2} unoptimized referrerPolicy="no-referrer" /> : <ChefHat size={40} />}<span className="card-number">{String(index + 1).padStart(2, '0')}</span>{restaurant.distance !== null&&<span className={`distance-badge ${outside?'outside':''}`}><MapPin size={14}/><span><strong>{formatDistance(restaurant.distance)}</strong><small>{formatTravelEstimate(restaurant.distance)} · from your delivery area</small>{outside&&<em>Outside delivery area</em>}</span></span>}</div></Link>
      <div className="restaurant-info"><div><Link className="restaurant-name-link" href={restaurantUrl}><h3>{restaurant.name}</h3></Link><div className="restaurant-description-shell"><p className={expanded?'expanded':''}>{description}</p>{isLong?<button type="button" onClick={()=>setExpandedDescriptions(current=>({...current,[restaurant.restaurant_id]:!current[restaurant.restaurant_id]}))}>{expanded?'See less':'See more'}</button>:<span aria-hidden="true"/>}</div>{city&&<small className="restaurant-address">{city}</small>}</div><Link className="round-arrow" href={restaurantUrl} aria-label={`View ${restaurant.name} menu`}><ArrowUpRight size={21} /></Link></div>
    </article>;
  })}</div>;
}
