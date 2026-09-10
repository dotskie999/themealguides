import { NextResponse } from 'next/server';

const BASE = 'https://psgc.cloud/api/v2';
const NCR_CODE = '1300000000';

export async function GET(request) {
  try {
    const cityCode = new URL(request.url).searchParams.get('city');
    const endpoint = cityCode
      ? `${BASE}/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`
      : `${BASE}/regions/${NCR_CODE}/cities-municipalities`;
    const response = await fetch(endpoint, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error('PSGC service is unavailable.');
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload.data || [];
    const locations = cityCode ? rows : rows.filter(row => ['City','Mun'].includes(row.type));
    return NextResponse.json(locations.map(row => ({ code: row.code, name: row.name })).sort((a,b) => a.name.localeCompare(b.name)));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
