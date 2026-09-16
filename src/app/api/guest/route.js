import { NextResponse } from 'next/server';
import { saveGuest } from '@/lib/api';

export async function POST(request) {
  try {
    const guest = await saveGuest(await request.json());
    return NextResponse.json({ ok: true, guest });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not save guest information.' }, { status: 400 });
  }
}
