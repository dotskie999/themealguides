const COUNTRY_MARKETS = {
  PH: ['ph-ncr'],
  GH: ['gh-greater-accra'],
};

const LEGACY_MARKET_ALIASES = {
  'gh-accra':'gh-greater-accra',
  'gh-tema':'gh-greater-accra',
};

export function normalizeDeploymentCountry(value) {
  return String(value || '').trim().toUpperCase() === 'GH' ? 'GH' : 'PH';
}

export const DEPLOYMENT_COUNTRY = normalizeDeploymentCountry(process.env.NEXT_PUBLIC_DEPLOYMENT_COUNTRY);
export const DEPLOYMENT_MARKET_CODES = COUNTRY_MARKETS[DEPLOYMENT_COUNTRY];
export const DEFAULT_DEPLOYMENT_MARKET = DEPLOYMENT_COUNTRY === 'GH' ? 'gh-greater-accra' : 'ph-ncr';
export const DEPLOYMENT_TIMEZONE = DEPLOYMENT_COUNTRY === 'GH' ? 'Africa/Accra' : 'Asia/Manila';
export const DEPLOYMENT_COUNTRY_NAME = DEPLOYMENT_COUNTRY === 'GH' ? 'Ghana' : 'Philippines';

export function canonicalDeploymentMarket(code) {
  const normalized=String(code||'').trim().toLowerCase();
  return LEGACY_MARKET_ALIASES[normalized]||normalized;
}

export function isDeploymentMarket(code) {
  return DEPLOYMENT_MARKET_CODES.includes(canonicalDeploymentMarket(code));
}
