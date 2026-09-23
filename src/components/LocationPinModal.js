'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Search, X } from 'lucide-react';

const marketCenter={
  'ph-ncr':[14.5995,120.9842,12],
  'gh-accra':[5.6037,-0.1870,12],
  'gh-tema':[5.6698,0.0166,12],
};

export default function LocationPinModal({marketCode,latitude,longitude,address='',onClose,onConfirm}) {
  const mapElement=useRef(null); const mapInstance=useRef(null); const markerInstance=useRef(null);
  const [query,setQuery]=useState(address); const [selection,setSelection]=useState(null); const [suggestions,setSuggestions]=useState([]);
  const [loading,setLoading]=useState(false); const [suggestionsLoading,setSuggestionsLoading]=useState(false); const [saving,setSaving]=useState(false); const [dirty,setDirty]=useState(false); const [error,setError]=useState('');

  useEffect(()=>{
    let disposed=false;
    async function initialize(){
      const L=(await import('leaflet')).default;
      if(disposed||!mapElement.current||mapInstance.current) return;
      const fallback=marketCenter[marketCode]||marketCenter['ph-ncr'];
      const hasPoint=latitude!==null&&latitude!==undefined&&longitude!==null&&longitude!==undefined&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude));
      const center=hasPoint?[Number(latitude),Number(longitude)]:fallback.slice(0,2);
      const map=L.map(mapElement.current,{zoomControl:true}).setView(center,hasPoint?17:fallback[2]);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);
      const icon=L.divIcon({className:'map-pin-marker',html:'<span></span>',iconSize:[34,44],iconAnchor:[17,42]});
      const marker=L.marker(center,{draggable:true,icon}).addTo(map); mapInstance.current=map; markerInstance.current=marker;
      async function choosePoint(point){
        marker.setLatLng(point); setLoading(true); setError(''); setSuggestions([]);
        try{
          const response=await fetch('/api/reverse-geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:point.lat,longitude:point.lng,market_code:marketCode})});
          const result=await response.json();
          if(!response.ok||!result.location) throw new Error(result.error||'No address found for this pin.');
          if(!disposed){setSelection(result.location);setQuery(result.location.formatted||'');setDirty(false);}
        } catch(reason){if(!disposed){setSelection(null);setError(reason.message);}} finally{if(!disposed)setLoading(false);}
      }
      map.on('click',event=>choosePoint(event.latlng)); marker.on('dragend',()=>choosePoint(marker.getLatLng()));
      if(hasPoint) choosePoint({lat:center[0],lng:center[1]});
      setTimeout(()=>{if(!disposed)map.invalidateSize();},0);
    }
    initialize();
    return()=>{disposed=true;if(mapInstance.current){mapInstance.current.remove();mapInstance.current=null;markerInstance.current=null;}};
  },[marketCode,latitude,longitude]);

  useEffect(()=>{
    if(query.trim().length<3||!dirty){setSuggestions([]);return;}
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      setSuggestionsLoading(true);
      try{
        const params=new URLSearchParams({q:query,market:marketCode});
        if(latitude!==null&&longitude!==null&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude))){params.set('lat',String(latitude));params.set('lon',String(longitude));}
        const response=await fetch(`/api/address-suggestions?${params}`,{signal:controller.signal}); const result=await response.json();
        setSuggestions(response.ok&&Array.isArray(result)?result:[]);
      } catch(reason){if(reason.name!=='AbortError')setSuggestions([]);} finally{if(!controller.signal.aborted)setSuggestionsLoading(false);}
    },450);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,dirty,marketCode,latitude,longitude]);

  function chooseSuggestion(suggestion){
    const point=[Number(suggestion.latitude),Number(suggestion.longitude)];
    markerInstance.current?.setLatLng(point);mapInstance.current?.setView(point,17);
    setSelection(suggestion);setQuery(suggestion.formatted||suggestion.house_number||query);setSuggestions([]);setDirty(false);setError('');
  }
  async function searchAddress(event){
    event.preventDefault();setError('');
    if(query.trim().length<3){setError('Enter the complete delivery address.');return;}
    if(suggestions[0]){chooseSuggestion(suggestions[0]);return;}
    setLoading(true);
    try{
      const response=await fetch(`/api/address-suggestions?${new URLSearchParams({q:query,market:marketCode})}`);const result=await response.json();
      if(!response.ok||!Array.isArray(result)||!result[0]) throw new Error(result.error||'No matching address was found.');
      chooseSuggestion(result[0]);
    }catch(reason){setError(reason.message);}finally{setLoading(false);}
  }
  async function confirm(){setSaving(true);setError('');try{await onConfirm(selection);onClose();}catch(reason){setError(reason.message);setSaving(false);}}

  return <div className="map-modal-backdrop"><section className="map-modal" role="dialog" aria-modal="true" aria-labelledby="map-pin-title"><header><div><p className="kicker">Exact delivery point</p><h2 id="map-pin-title">Confirm your address</h2></div><button onClick={onClose} aria-label="Close map"><X/></button></header><p className="map-modal-help">Search your complete address, select a suggestion, then fine-tune the pin if needed.</p><form className="map-search-form" onSubmit={searchAddress}><div className="map-search-box"><Search/><input value={query} onChange={event=>{setQuery(event.target.value);setDirty(true);setSelection(null);}} autoComplete="off" placeholder="House number, street, barangay, city" autoFocus required/>{suggestionsLoading&&<Loader2 className="spin"/>}</div>{suggestions.length>0&&<div className="address-suggestions" role="listbox">{suggestions.map((suggestion,index)=><button type="button" role="option" aria-selected="false" onClick={()=>chooseSuggestion(suggestion)} key={`${suggestion.place_id||suggestion.formatted}-${index}`}><MapPin/><span><strong>{suggestion.house_number||suggestion.formatted}</strong><small>{suggestion.formatted}</small></span></button>)}</div>}<button disabled={loading}>{loading?<Loader2 className="spin"/>:<Search/>} Find on map</button></form><div className="map-canvas" ref={mapElement}/><div className="map-selection"><MapPin/>{loading?<span><Loader2 className="spin"/> Finding the location…</span>:selection?<span><strong>Pin ready</strong><small>{selection.formatted}</small></span>:<span>Search an address or move the pin.</span>}</div>{error&&<p className="form-error" role="alert">{error}</p>}<footer><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={confirm} disabled={!selection||dirty||loading||saving}>{saving?<Loader2 className="spin"/>:<Check/>}{saving?'Applying…':'Confirm location'}</button></footer></section></div>;
}
