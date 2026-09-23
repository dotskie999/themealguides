import crypto from 'crypto';

export const ADMIN_COOKIE = 'tmg_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  globalThis.__tmgAdminSessionSecret ||= crypto.randomBytes(32).toString('hex');
  return globalThis.__tmgAdminSessionSecret;
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createAdminToken(session = {}) {
  const payload = Buffer.from(JSON.stringify({
    type: session.type === 'emergency' ? 'emergency' : 'account',
    userId: session.userId || null,
    expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
  })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token) {
  if (!token) return null;
  const [payload, supplied] = String(token).split('.');
  if (!payload || !supplied) return null;
  const expected = sign(payload);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.expiresAt || Number(session.expiresAt) <= Date.now()) return null;
    if (session.type === 'account' && !session.userId) return null;
    return session;
  } catch { return null; }
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};
