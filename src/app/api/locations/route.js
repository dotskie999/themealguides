import { NextResponse } from 'next/server';
import { GHANA_LOCATIONS } from '@/lib/markets';
import { assertServerMarket, serverDefaultMarket } from '@/lib/deploymentServer';

const BASE = 'https://psgc.cloud/api/v2';
const LEGACY_BASE = 'https://psgc.cloud/api';
const NCR_CODE = '1300000000';
const MANILA_CODE = '1380600000';

const payloadRows = (payload) => Array.isArray(payload) ? payload : payload?.data || [];

async function fetchRows(endpoint) {
  const response = await fetch(endpoint, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error('PSGC service is unavailable.');
  return payloadRows(await response.json());
}

async function getManilaBarangays() {
  const districts = await fetchRows(`${LEGACY_BASE}/sub-municipalities`);
  const districtBarangays = await Promise.all(districts.map((district) =>
    fetchRows(`${LEGACY_BASE}/sub-municipalities/${encodeURIComponent(district.code)}/barangays`),
  ));
  return districtBarangays.flat();
}

export async function GET(request) {
  try {
    const cityCode = new URL(request.url).searchParams.get('city');
    const market = assertServerMarket(new URL(request.url).searchParams.get('market') || serverDefaultMarket());
    if (GHANA_LOCATIONS[market]) {
      const municipalities = GHANA_LOCATIONS[market];
      const municipality = municipalities.find(([code]) => code === cityCode);
      const rows = cityCode
        ? (municipality?.[2] || []).map((name,index) => ({ code:`${cityCode}-${index + 1}`, name }))
        : municipalities.map(([code,name]) => ({ code,name }));
      return NextResponse.json(rows);
    }
    const rows = cityCode === MANILA_CODE
      ? await getManilaBarangays()
      : await fetchRows(cityCode
        ? `${BASE}/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`
        : `${BASE}/regions/${NCR_CODE}/cities-municipalities`);
    const locations = cityCode ? rows : rows.filter(row => ['City','Mun'].includes(row.type));
    return NextResponse.json(locations.map(row => ({ code: row.code, name: row.name })).sort((a,b) => a.name.localeCompare(b.name,undefined,{numeric:true})));
  } catch (error) {
    const status=String(error.message||'').includes('deployment cannot access')?400:502;
    return NextResponse.json({ error: error.message }, { status });
  }
}
