import { NextResponse } from 'next/server';
import { geoapifyAutocomplete, geoapifyConfigured } from '@/lib/geoapify';
import { normalizeMarketCode } from '@/lib/markets';

export const runtime='edge';
export const dynamic='force-dynamic';

const suggestionCache=new Map();
const CACHE_TTL_MS=10*60*1000;

export async function GET(request) {
  try {
    if(!geoapifyConfigured()) return NextResponse.json({error:'Geoapify is not configured.'},{status:503});
    const {searchParams}=new URL(request.url); const text=String(searchParams.get('q')||'').trim();
    if(text.length<3) return NextResponse.json([]);
    if(text.length>180) return NextResponse.json({error:'Address search is too long.'},{status:400});
    const latitudeValue=searchParams.get('lat'); const longitudeValue=searchParams.get('lon');
    const latitude=latitudeValue===null?null:Number(latitudeValue); const longitude=longitudeValue===null?null:Number(longitudeValue);
    const marketCode=normalizeMarketCode(searchParams.get('market'));
    const bias=latitude!==null&&longitude!==null&&Number.isFinite(latitude)&&Number.isFinite(longitude)?`proximity:${longitude},${latitude}`:undefined;
    const cacheKey=`${marketCode}|${bias||''}|${text.toLowerCase()}`;
    const cached=suggestionCache.get(cacheKey);
    if(cached&&Date.now()-cached.createdAt<CACHE_TTL_MS) return NextResponse.json(cached.rows,{headers:{'Cache-Control':'private, max-age=300'}});
    const rows=await geoapifyAutocomplete({text,marketCode,bias,limit:5});
    suggestionCache.set(cacheKey,{createdAt:Date.now(),rows});
    if(suggestionCache.size>250) suggestionCache.delete(suggestionCache.keys().next().value);
    return NextResponse.json(rows,{headers:{'Cache-Control':'private, max-age=300'}});
  } catch(error){return NextResponse.json({error:error.message||'Address suggestions are unavailable.'},{status:502});}
}
