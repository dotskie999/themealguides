import { NextResponse } from 'next/server';
import { getDeliveryQuote } from '@/lib/api';

export async function POST(request) {
  try { return NextResponse.json(await getDeliveryQuote(await request.json())); }
  catch(error){return NextResponse.json({error:error.message||'Could not calculate delivery fee.'},{status:400});}
}
