import 'server-only';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getMarket, normalizeMarketCode } from '@/lib/markets';

const runtime = globalThis;
runtime.__tmgGeocodeQueue ||= Promise.resolve();
runtime.__tmgLastGeocodeAt ||= 0;

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const cacheKey = (city, barangay, marketCode) => `${marketCode}|${normalize(barangay).toLowerCase()}|${normalize(city).toLowerCase()}`;

async function publicGeocode(city, barangay, marketCode) {
  const task = runtime.__tmgGeocodeQueue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - runtime.__tmgLastGeocodeAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    runtime.__tmgLastGeocodeAt = Date.now();
    const market = getMarket(marketCode);
    const query = `${barangay}, ${city}, ${market.region}, ${market.country}`;
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', market.countryCode.toLowerCase());
    url.searchParams.set('addressdetails', '1');
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'TheMealGuides/1.0 (https://www.facebook.com/themealguides)',
      },
    });
    if (!response.ok) throw new Error('Address lookup is temporarily unavailable.');
    const results = await response.json();
    const match = Array.isArray(results) ? results[0] : null;
    if (!match) return null;
    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, display_name: match.display_name || query };
  });
  runtime.__tmgGeocodeQueue = task.catch(() => {});
  return task;
}

export async function geocodeDeliveryArea(cityValue, barangayValue, marketValue = 'ph-ncr') {
  const city = normalize(cityValue);
  const barangay = normalize(barangayValue);
  const marketCode = normalizeMarketCode(marketValue);
  if (!city || !barangay || city.length > 100 || barangay.length > 100) {
    throw new Error('A valid city and barangay are required.');
  }

  const key = cacheKey(city, barangay, marketCode);
  const { data: cached, error: cacheError } = await supabaseAdmin
    .from('location_cache')
    .select('latitude,longitude,display_name')
    .eq('cache_key', key)
    .maybeSingle();
  if (!cacheError && cached) return { ...cached, source: 'cache' };

  const result = await publicGeocode(city, barangay, marketCode);
  if (!result) return null;

  await supabaseAdmin.from('location_cache').upsert({
    cache_key: key,
    city,
    barangay,
    ...result,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'cache_key' });
  return { ...result, source: 'openstreetmap' };
}
