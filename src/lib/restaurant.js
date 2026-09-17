const METRO_MANILA_CITIES = [
  'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila',
  'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig',
  'Quezon City', 'San Juan', 'Taguig', 'Valenzuela', 'Pateros',
];

export function restaurantSlug(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function restaurantCity(restaurant = {}) {
  if (restaurant.city) return String(restaurant.city).trim();
  const address = String(restaurant.address || '');
  return METRO_MANILA_CITIES.find((city) => new RegExp(`\\b${city.replace(' ', '\\s+')}\\b`, 'i').test(address)) || '';
}
