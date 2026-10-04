import { NextResponse } from 'next/server';
import { reverseGeocodeCoordinates } from '@/lib/geocode';
import { assertServerMarket } from '@/lib/deploymentServer';

export async function POST(request) {
  try {
    const {latitude,longitude,market_code}=await request.json();
    return NextResponse.json({location:await reverseGeocodeCoordinates(latitude,longitude,assertServerMarket(market_code))});
  } catch(error) {
    return NextResponse.json({error:error.message||'Could not identify this map location.'},{status:400});
  }
}
