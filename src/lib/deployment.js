const COUNTRY_MARKETS = {
  PH: ['ph-ncr'],
  GH: ['gh-accra', 'gh-tema'],
};

export function normalizeDeploymentCountry(value) {
  return String(value || '').trim().toUpperCase() === 'GH' ? 'GH' : 'PH';
}

export const DEPLOYMENT_COUNTRY = normalizeDeploymentCountry(process.env.NEXT_PUBLIC_DEPLOYMENT_COUNTRY);
export const DEPLOYMENT_MARKET_CODES = COUNTRY_MARKETS[DEPLOYMENT_COUNTRY];
export const DEFAULT_DEPLOYMENT_MARKET = DEPLOYMENT_COUNTRY === 'GH' ? 'gh-accra' : 'ph-ncr';
export const DEPLOYMENT_TIMEZONE = DEPLOYMENT_COUNTRY === 'GH' ? 'Africa/Accra' : 'Asia/Manila';
export const DEPLOYMENT_COUNTRY_NAME = DEPLOYMENT_COUNTRY === 'GH' ? 'Ghana' : 'Philippines';

export function isDeploymentMarket(code) {
  return DEPLOYMENT_MARKET_CODES.includes(String(code || '').toLowerCase());
}
