'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_MARKET, getMarket, normalizeMarketCode } from '@/lib/markets';

const GuestContext = createContext(null);
export const GUEST_KEY = 'tmg-guest-v1';

async function syncGuest(guest, trackVisit = true) {
  const response = await fetch('/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...guest, track_visit: trackVisit }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not save your details.');
  return result.guest;
}

export function GuestProvider({ children }) {
  const [guest, setGuest] = useState(null);
  const [guestReady, setGuestReady] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(GUEST_KEY) || 'null');
      if (stored?.guest_id && stored?.consent_at) {
        const marketCode = normalizeMarketCode(stored.market_code || DEFAULT_MARKET);
        const market = getMarket(marketCode);
        const migratedStored = { ...stored, market_code:marketCode, country_code:stored.country_code || market.countryCode };
        const safeStored = migratedStored.location_source === 'address' ? migratedStored : {
          ...migratedStored,
          latitude: null,
          longitude: null,
          location_accuracy: null,
          location_source: null,
        };
        setGuest(safeStored);
        localStorage.setItem(GUEST_KEY, JSON.stringify(safeStored));
        (async () => {
          let refreshed = safeStored;
          if (safeStored.location_source !== 'address' && safeStored.city && safeStored.barangay) {
            try {
              const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city: safeStored.city, barangay: safeStored.barangay, market_code:safeStored.market_code }),
              });
              const result = await response.json();
              if (response.ok && result.location) refreshed = {
                ...safeStored,
                latitude: result.location.latitude,
                longitude: result.location.longitude,
                location_source: 'address',
              };
            } catch {}
          }
          const saved = await syncGuest(refreshed).catch(() => null);
          if (saved) {
            const nextGuest = { ...refreshed, ...saved };
            localStorage.setItem(GUEST_KEY, JSON.stringify(nextGuest));
            setGuest(nextGuest);
          }
        })();
      }
    } catch {}
    setGuestReady(true);
  }, []);

  const saveGuest = useCallback(async (details) => {
    const record = {
      ...details,
      guest_id: details.guest_id || crypto.randomUUID(),
      consent_at: details.consent_at || new Date().toISOString(),
    };
    const saved = await syncGuest(record, true);
    const localGuest = { ...record, ...saved };
    localStorage.setItem(GUEST_KEY, JSON.stringify(localGuest));
    setGuest(localGuest);
    return localGuest;
  }, []);

  const updateLocation = useCallback(async ({ latitude, longitude, location_accuracy, location_source }) => {
    if (!guest) return null;
    const saved = await syncGuest({ ...guest, latitude, longitude, location_accuracy, location_source }, false);
    const localGuest = { ...guest, ...saved };
    localStorage.setItem(GUEST_KEY, JSON.stringify(localGuest));
    setGuest(localGuest);
    return localGuest;
  }, [guest]);

  const updateGuest = useCallback(async (details) => {
    if (!guest) return null;
    const record = { ...guest, ...details, guest_id: guest.guest_id, consent_at: guest.consent_at };
    const saved = await syncGuest(record, false);
    const localGuest = { ...record, ...saved };
    localStorage.setItem(GUEST_KEY, JSON.stringify(localGuest));
    setGuest(localGuest);
    return localGuest;
  }, [guest]);

  return <GuestContext.Provider value={{ guest, guestReady, saveGuest, updateLocation, updateGuest }}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuest must be used inside GuestProvider.');
  return context;
}
