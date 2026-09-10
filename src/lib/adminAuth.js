import crypto from 'crypto';

export const ADMIN_COOKIE = 'tmg_admin';
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  globalThis.__tmgAdminSessionSecret ||= crypto.randomBytes(32).toString('hex');
  return globalThis.__tmgAdminSessionSecret;
}

function signature(expiresAt) {
  return crypto.createHmac('sha256', secret()).update(String(expiresAt)).digest('hex');
}

export function createAdminToken() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function verifyAdminToken(token) {
  if (!token) return false;
  const [expiresAt, supplied] = String(token).split('.');
  if (!expiresAt || !supplied || Number(expiresAt) <= Date.now()) return false;
  const expected = signature(expiresAt);
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
};
