import { NextResponse } from 'next/server';
import { submitOrder } from '@/lib/api';

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await submitOrder(payload);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Could not submit order.' }, { status: 500 });
  }
}
