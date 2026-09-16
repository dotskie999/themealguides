'use client';

import { useState } from 'react';
import { LocateFixed, Loader2, MapPin } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';

export default function GuestGreeting() {
  const { guest, updateLocation } = useGuest();
  const [locating, setLocating] = useState(false);
  if (!guest) return null;
  const firstName = guest.customer_name?.trim().split(/\s+/)[0] || 'there';
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => updateLocation({ latitude: coords.latitude, longitude: coords.longitude, location_accuracy: Math.round(coords.accuracy) }).finally(() => setLocating(false)),
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    );
  };
  return <div className="guest-greeting"><span>Hello, {firstName}!</span><small><MapPin size={13} /> {guest.barangay}, {guest.city}</small>{!guest.latitude&&<button onClick={locate} disabled={locating} title="Share your approximate device location for distance and delivery"><>{locating?<Loader2 className="spin" size={13}/>:<LocateFixed size={13}/>} Enable distance</></button>}</div>;
}
