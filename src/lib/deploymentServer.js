import 'server-only';

import { normalizeDeploymentCountry } from '@/lib/deployment';

export function serverDeploymentCountry() {
  const serverCountry=normalizeDeploymentCountry(process.env.DEPLOYMENT_COUNTRY || process.env.NEXT_PUBLIC_DEPLOYMENT_COUNTRY);
  const publicCountry=normalizeDeploymentCountry(process.env.NEXT_PUBLIC_DEPLOYMENT_COUNTRY);
  if(process.env.DEPLOYMENT_COUNTRY && process.env.NEXT_PUBLIC_DEPLOYMENT_COUNTRY && serverCountry!==publicCountry) {
    throw new Error('DEPLOYMENT_COUNTRY and NEXT_PUBLIC_DEPLOYMENT_COUNTRY must match.');
  }
  return serverCountry;
}

export function serverMarketCodes() {
  return serverDeploymentCountry()==='GH' ? ['gh-accra','gh-tema'] : ['ph-ncr'];
}

export function serverDefaultMarket() {
  return serverDeploymentCountry()==='GH' ? 'gh-accra' : 'ph-ncr';
}

export function isServerMarket(code) {
  return serverMarketCodes().includes(String(code || '').trim().toLowerCase());
}

export function assertServerMarket(code) {
  const normalized=String(code || '').trim().toLowerCase();
  if(!isServerMarket(normalized)) throw new Error(`This ${serverDeploymentCountry()} deployment cannot access the selected market.`);
  return normalized;
}
