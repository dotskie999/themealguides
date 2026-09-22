import { NextResponse } from 'next/server';
import { geocodeDeliveryArea } from '@/lib/geocode';

export async function POST(request) {
  try {
    const { city, barangay, market_code } = await request.json();
    const location = await geocodeDeliveryArea(city, barangay, market_code);
    return NextResponse.json({ location });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not estimate this delivery area.' }, { status: 400 });
  }
}
