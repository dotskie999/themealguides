'use client';

import { MapPin } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { distanceKm, formatDistance, formatTravelEstimate } from '@/lib/distance';
import { restaurantCity } from '@/lib/restaurant';

export default function RestaurantDistance({ restaurant }) {
  const { guest } = useGuest();
  const distance = distanceKm(guest?.latitude, guest?.longitude, restaurant?.latitude, restaurant?.longitude);
  const city = restaurantCity(restaurant);
  if (distance === null) return city ? <p className="restaurant-location"><MapPin size={16}/>{city}</p> : null;
  const radius = Number(restaurant.delivery_radius_km || 0);
  const outside = radius > 0 && distance > radius;
  return <p className={`restaurant-location ${outside?'outside':''}`}><MapPin size={16}/><span><strong>{formatDistance(distance)} · {formatTravelEstimate(distance)} estimated</strong><small>From the center of your saved delivery area{city?` · ${city}`:''}</small>{outside&&<em>Outside delivery area</em>}</span></p>;
}
