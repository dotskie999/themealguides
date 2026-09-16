import { NextResponse } from 'next/server';
import { verifyAdminPin } from '@/lib/api';
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken } from '@/lib/adminAuth';

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request) {
  const key = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.until > now && entry.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }
  try {
    const { pin } = await request.json();
    if (!pin) return NextResponse.json({ error: 'Enter your admin PIN.' }, { status: 400 });
    if (!verifyAdminPin(pin)) {
      attempts.set(key, { count: (entry?.until > now ? entry.count : 0) + 1, until: now + WINDOW_MS });
      return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
    }
    attempts.delete(key);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Unable to sign in.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
  return response;
}
