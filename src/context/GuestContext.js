'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
        setGuest(stored);
        syncGuest(stored).catch(() => {});
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

  const updateLocation = useCallback(async ({ latitude, longitude, location_accuracy }) => {
    if (!guest) return null;
    const saved = await syncGuest({ ...guest, latitude, longitude, location_accuracy }, false);
    const localGuest = { ...guest, ...saved };
    localStorage.setItem(GUEST_KEY, JSON.stringify(localGuest));
    setGuest(localGuest);
    return localGuest;
  }, [guest]);

  return <GuestContext.Provider value={{ guest, guestReady, saveGuest, updateLocation }}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuest must be used inside GuestProvider.');
  return context;
}
