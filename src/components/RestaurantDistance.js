'use client';

import { MapPin } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { distanceKm, formatDistance, formatTravelEstimate } from '@/lib/distance';

export default function RestaurantDistance({ restaurant }) {
  const { guest } = useGuest();
  const distance = distanceKm(guest?.latitude, guest?.longitude, restaurant?.latitude, restaurant?.longitude);
  if (distance === null) return restaurant?.address ? <p className="restaurant-location"><MapPin size={16}/>{restaurant.address}</p> : null;
  const radius = Number(restaurant.delivery_radius_km || 0);
  const outside = radius > 0 && distance > radius;
  return <p className={`restaurant-location ${outside?'outside':''}`}><MapPin size={16}/><span><strong>{formatDistance(distance)} · {formatTravelEstimate(distance)} estimated</strong><small>From the center of your saved delivery area{restaurant.address?` · ${restaurant.address}`:''}</small>{outside&&<em>Outside delivery area</em>}</span></p>;
}
