const EARTH_RADIUS_KM = 6371;

export function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((value) => value === null || value === undefined || value === '')) return null;
  const values = [lat1, lon1, lat2, lon2].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [aLat, aLon, bLat, bLon] = values.map((value) => value * Math.PI / 180);
  const latDelta = bLat - aLat;
  const lonDelta = bLon - aLon;
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(aLat) * Math.cos(bLat) * Math.sin(lonDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(kilometers) {
  if (!Number.isFinite(kilometers)) return '';
  if (kilometers < 1) return `${Math.max(50, Math.round(kilometers * 1000 / 50) * 50)} m away`;
  return `${kilometers.toFixed(kilometers < 10 ? 1 : 0)} km away`;
}

export function estimatedTravelMinutes(kilometers) {
  if (!Number.isFinite(kilometers)) return null;
  // Straight-line distance is adjusted for typical road routing, then estimated
  // using a conservative urban delivery speed. This is not a live-traffic ETA.
  const midpoint = Math.max(5, Math.round((kilometers * 1.3 / 18) * 60 + 3));
  const spread = Math.max(2, Math.round(midpoint * 0.2));
  return { min: Math.max(4, midpoint - spread), max: midpoint + spread };
}

export function formatTravelEstimate(kilometers) {
  const estimate = estimatedTravelMinutes(kilometers);
  return estimate ? `about ${estimate.min}–${estimate.max} min` : '';
}
