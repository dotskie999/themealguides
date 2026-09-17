'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ChefHat, MapPin } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { distanceKm, formatDistance, formatTravelEstimate } from '@/lib/distance';
import { normalizeImageUrl } from '@/lib/images';
import { restaurantCity, restaurantSlug } from '@/lib/restaurant';

export default function RestaurantGrid({ restaurants }) {
  const { guest } = useGuest();
  const rows = useMemo(() => restaurants.map((restaurant) => ({
    ...restaurant,
    distance: distanceKm(guest?.latitude, guest?.longitude, restaurant.latitude, restaurant.longitude),
  })).sort((a, b) => {
    if (a.distance === null) return 1;
    if (b.distance === null) return -1;
    return a.distance - b.distance;
  }), [guest?.latitude, guest?.longitude, restaurants]);

  return <div className="restaurant-grid">{rows.map((restaurant, index) => {
    const radius = Number(restaurant.delivery_radius_km || 0);
    const outside = restaurant.distance !== null && radius > 0 && restaurant.distance > radius;
    const city = restaurantCity(restaurant);
    return <Link className="restaurant-card" href={`/restaurant/${restaurantSlug(restaurant.name)}`} key={restaurant.restaurant_id}>
      <div className="restaurant-art">{normalizeImageUrl(restaurant.logo_url) ? <Image src={normalizeImageUrl(restaurant.logo_url)} alt={`${restaurant.name} logo`} fill sizes="(max-width: 699px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 44px), 380px" priority={index < 2} unoptimized referrerPolicy="no-referrer" /> : <ChefHat size={40} />}<span className="card-number">{String(index + 1).padStart(2, '0')}</span>{restaurant.distance !== null&&<span className={`distance-badge ${outside?'outside':''}`}><MapPin size={14}/><span><strong>{formatDistance(restaurant.distance)}</strong><small>{formatTravelEstimate(restaurant.distance)} · from your delivery area</small>{outside&&<em>Outside delivery area</em>}</span></span>}</div>
      <div className="restaurant-info"><div><h3>{restaurant.name}</h3><p>{restaurant.description || 'A fresh menu made for your cravings.'}</p>{city&&<small className="restaurant-address">{city}</small>}</div><span className="round-arrow"><ArrowUpRight size={21} /></span></div>
    </Link>;
  })}</div>;
}
