import { NextResponse } from 'next/server';
import { geoapifyAutocomplete, geoapifyConfigured } from '@/lib/geoapify';
import { normalizeMarketCode } from '@/lib/markets';

export async function GET(request) {
  try {
    if(!geoapifyConfigured()) return NextResponse.json({error:'Geoapify is not configured.'},{status:503});
    const {searchParams}=new URL(request.url); const text=String(searchParams.get('q')||'').trim();
    if(text.length<3) return NextResponse.json([]);
    if(text.length>180) return NextResponse.json({error:'Address search is too long.'},{status:400});
    const latitudeValue=searchParams.get('lat'); const longitudeValue=searchParams.get('lon');
    const latitude=latitudeValue===null?null:Number(latitudeValue); const longitude=longitudeValue===null?null:Number(longitudeValue);
    const bias=latitude!==null&&longitude!==null&&Number.isFinite(latitude)&&Number.isFinite(longitude)?`proximity:${longitude},${latitude}`:undefined;
    return NextResponse.json(await geoapifyAutocomplete({text,marketCode:normalizeMarketCode(searchParams.get('market')),bias}));
  } catch(error){return NextResponse.json({error:error.message||'Address suggestions are unavailable.'},{status:502});}
}
