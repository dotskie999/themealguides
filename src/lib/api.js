const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiRequest(action, { params = {}, method = 'GET', body } = {}) {
  if (!API_URL) throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url.toString(), {
    method,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
  const result = await response.json();
  if (result?.success === false) throw new Error(result.error || 'The kitchen could not complete the request.');
  return result?.data ?? result;
}

export const getRestaurants = () => apiRequest('getRestaurants');
export const getMenu = (restaurantId) => apiRequest('getMenu', { params: { restaurant_id: restaurantId } });
export const submitOrder = (payload) => apiRequest('submitOrder', { method: 'POST', body: payload });
