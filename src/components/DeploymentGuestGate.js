'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Loader2, LocateFixed, LockKeyhole, MapPin, MapPinned, ShieldCheck, Sparkles } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { getMarket } from '@/lib/markets';
import { DEFAULT_DEPLOYMENT_MARKET, DEPLOYMENT_COUNTRY, DEPLOYMENT_COUNTRY_NAME } from '@/lib/deployment';
import LocationPinModal, { preloadLocationMap } from '@/components/LocationPinModal';

const defaultMarket=getMarket(DEFAULT_DEPLOYMENT_MARKET);
const initialForm = {
  market_code:DEFAULT_DEPLOYMENT_MARKET, market_selection_source:'deployment', country_code:DEPLOYMENT_COUNTRY,
  city:'', city_code:'', barangay:'', house_number:'', formatted_address:'', landmark:'', digital_address:'',
  customer_name:'', customer_email:'', contact_number:defaultMarket.phonePrefix, consent:false,
  latitude:null, longitude:null, location_accuracy:null, location_source:null, location_precision:null,
};
const validPhone = (phone) => DEPLOYMENT_COUNTRY==='GH' ? /^\+233\d{9}$/.test(phone) : /^\+63\d{10}$/.test(phone);

export default function DeploymentGuestGate({ children }) {
  const pathname = usePathname();
  const { guest, guestReady, saveGuest } = useGuest();
  const [step, setStep] = useState('location');
  const [form, setForm] = useState(initialForm);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mapOpen,setMapOpen]=useState(false);
  const [geoStatus,setGeoStatus]=useState('idle');
  const [geoMessage,setGeoMessage]=useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const geoRequested=useRef(false);
  const pinConfirmed=useRef(false);
  const cancelGeoWatch=useRef(()=>{});
  const exempt = pathname.startsWith('/admin') || pathname.startsWith('/receipt/');
  const market = getMarket(form.market_code);
  const isGhana=DEPLOYMENT_COUNTRY==='GH';
  const guestHasConfirmedPin=!isGhana||Boolean(guest&&guest.location_source==='map_pin'&&guest.formatted_address&&Number.isFinite(Number(guest.latitude))&&Number.isFinite(Number(guest.longitude)));

  useEffect(()=>{
    if(!isGhana||!guest||guestHasConfirmedPin) return;
    setForm((current)=>({...current,...guest,market_code:DEFAULT_DEPLOYMENT_MARKET,country_code:DEPLOYMENT_COUNTRY,contact_number:guest.contact_number||defaultMarket.phonePrefix,formatted_address:'',latitude:null,longitude:null,location_accuracy:null,location_source:null,location_precision:null,consent:Boolean(guest.consent_at)}));
  },[isGhana,guest,guestHasConfirmedPin]);

  useEffect(() => {
    if (isGhana || exempt || guest || !guestReady || step !== 'location' || !form.market_code) return;
    const controller=new AbortController();
    setLoadingLocations(true); setError('');
    fetch(`/api/locations?market=${encodeURIComponent(form.market_code)}`,{signal:controller.signal})
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'Could not load delivery areas.');
        setCities(result);
      })
      .catch((err) => { if(err.name!=='AbortError') setError(err.message); })
      .finally(() => { if(!controller.signal.aborted) setLoadingLocations(false); });
    return()=>controller.abort();
  }, [isGhana, exempt, guest, guestReady, step, form.market_code]);

  useEffect(()=>{
    if(!isGhana||exempt||(guest&&guestHasConfirmedPin)||!guestReady||step!=='location'||geoRequested.current) return;
    geoRequested.current=true;
    preloadLocationMap().catch(()=>{});
    if(!navigator.geolocation){
      setGeoStatus('unavailable');
      setGeoMessage('Automatic location is unavailable in this browser. Choose your delivery point on the map.');
      return;
    }
    let disposed=false; let watchId=null; let settleTimer=null; let bestPosition=null; let finished=false; let deadlinePassed=false;
    setGeoStatus('locating');
    setGeoMessage('Detecting your current location and improving GPS accuracy…');
    const clearGps=()=>{
      if(watchId!==null){navigator.geolocation.clearWatch(watchId);watchId=null;}
      if(settleTimer!==null){window.clearTimeout(settleTimer);settleTimer=null;}
    };
    const cancelGps=()=>{finished=true;clearGps();};
    cancelGeoWatch.current=cancelGps;
    const finishWithPosition=(position)=>{
      if(disposed||finished||pinConfirmed.current) return;
      finished=true; clearGps();
      const accuracy=Number(position.coords.accuracy);
      setForm((current)=>({...current,latitude:position.coords.latitude,longitude:position.coords.longitude,location_accuracy:Number.isFinite(accuracy)?accuracy:null,location_source:'gps',location_precision:'gps'}));
      setGeoStatus('found');
      setGeoMessage(Number.isFinite(accuracy)?`GPS fix is accurate to about ${Math.max(1,Math.round(accuracy))} metres. Confirm or fine-tune the pin.`:'Location found. Confirm or fine-tune the pin on the map.');
      setMapOpen(true);
    };
    const handlePosition=(position)=>{
      if(disposed||finished) return;
      if(pinConfirmed.current){finished=true;clearGps();return;}
      const accuracy=Number(position.coords.accuracy);
      const previousAccuracy=Number(bestPosition?.coords.accuracy);
      if(!bestPosition||!Number.isFinite(previousAccuracy)||(Number.isFinite(accuracy)&&accuracy<previousAccuracy)) bestPosition=position;
      const bestAccuracy=Number(bestPosition.coords.accuracy);
      if(Number.isFinite(bestAccuracy)) setGeoMessage(`Improving GPS accuracy… currently about ${Math.max(1,Math.round(bestAccuracy))} metres.`);
      if((Number.isFinite(accuracy)&&accuracy<=30)||deadlinePassed) finishWithPosition(bestPosition);
    };
    const handleError=(reason)=>{
      if(disposed||finished) return;
      if(pinConfirmed.current){finished=true;clearGps();return;}
      if(bestPosition){finishWithPosition(bestPosition);return;}
      clearGps(); finished=true;
      setGeoStatus(reason.code===1?'denied':'unavailable');
      setGeoMessage(reason.code===1?'Location permission was not allowed. Search or move the pin on the map instead.':'We could not detect your location. Search or move the pin on the map instead.');
    };
    watchId=navigator.geolocation.watchPosition(handlePosition,handleError,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
    settleTimer=window.setTimeout(()=>{
      deadlinePassed=true;
      if(bestPosition) finishWithPosition(bestPosition);
    },9000);
    return()=>{disposed=true;clearGps();if(cancelGeoWatch.current===cancelGps)cancelGeoWatch.current=()=>{};geoRequested.current=false;};
  },[isGhana,exempt,guest,guestHasConfirmedPin,guestReady,step]);

  const update = (event) => { const { name,value,checked,type }=event.target; setForm((current)=>({...current,[name]:type==='checkbox'?checked:value})); };
  const chooseCity = async (event) => {
    const cityCode=event.target.value; const city=cities.find((entry)=>entry.code===cityCode)?.name||'';
    setForm((current)=>({...current,city_code:cityCode,city,barangay:'',latitude:null,longitude:null,location_source:null})); setBarangays([]);
    if(!cityCode) return; setLoadingLocations(true); setError('');
    try { const response=await fetch(`/api/locations?market=${encodeURIComponent(form.market_code)}&city=${encodeURIComponent(cityCode)}`); const result=await response.json(); if(!response.ok||!Array.isArray(result)) throw new Error(result.error||'Could not load local areas.'); setBarangays(result); }
    catch(err){setError(err.message);} finally{setLoadingLocations(false);}
  };
  const applyPinnedLocation = (location) => {
    if(!location||!Number.isFinite(Number(location.latitude))||!Number.isFinite(Number(location.longitude))) throw new Error('Select a location on the map first.');
    const formatted=String(location.formatted||'').trim();
    if(!formatted) throw new Error('Choose a pin that has a recognizable delivery address.');
    const city=location.city||market.region;
    const barangay=location.barangay||location.city||'Pinned location';
    const houseNumber=location.house_number||formatted;
    const accuracy=Number(location.accuracy);
    pinConfirmed.current=true;
    cancelGeoWatch.current();
    setForm((current)=>({...current,city,city_code:'',barangay,house_number:houseNumber,formatted_address:formatted,latitude:Number(location.latitude),longitude:Number(location.longitude),location_accuracy:Number.isFinite(accuracy)&&accuracy>0?accuracy:null,location_source:'map_pin',location_precision:'pin'}));
    setGeoStatus('confirmed');
    setGeoMessage('Delivery pin confirmed.');
    setError('');
    setMapOpen(false);
  };
  const openMap=()=>{
    if(geoStatus==='locating'){
      cancelGeoWatch.current();
      setGeoStatus('manual');
      setGeoMessage('Automatic GPS search stopped. Search or move the pin to your entrance.');
    }
    setMapOpen(true);
  };
  const closeMap=()=>{
    cancelGeoWatch.current();
    if(geoStatus==='locating'){
      setGeoStatus('manual');
      setGeoMessage('Automatic GPS search stopped. Open the map when you are ready to choose the delivery pin.');
    }
    setMapOpen(false);
  };
  const confirmLocation = async (event) => {
    event.preventDefault(); setError('');
    if(isGhana){
      if(form.location_source!=='map_pin'||!form.formatted_address){setError('Confirm your exact delivery pin on the map before continuing.');return;}
      setStep('finding');
      setLocationMessage('Your delivery pin is saved. You can adjust it again from your guest card or during checkout.');
      window.setTimeout(()=>setStep('details'),1000);
      return;
    }
    setStep('finding'); const startedAt=Date.now();
    try { const response=await fetch('/api/geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({city:form.city,barangay:form.barangay,market_code:form.market_code})}); const result=await response.json(); if(!response.ok) throw new Error(result.error||'Address lookup unavailable.'); if(result.location){setForm((current)=>({...current,latitude:result.location.latitude,longitude:result.location.longitude,location_accuracy:null,location_source:'address'}));setLocationMessage('We found your selected delivery area. You can confirm the exact pin during checkout.');}else setLocationMessage('Your address is saved. You can confirm the exact pin during checkout.'); }
    catch{setLocationMessage('Your address is saved. You can confirm the exact pin during checkout.');}
    finally{window.setTimeout(()=>setStep('details'),Math.max(0,1000-(Date.now()-startedAt)));}
  };
  const submitDetails = async (event) => {
    event.preventDefault(); setError(''); if(!form.consent){setError('Please confirm your consent to continue.');return;} const phone=form.contact_number.replace(/\s/g,'');
    if(!validPhone(phone)){setError(`Use a valid ${market.country} number beginning with ${market.phonePrefix}.`);return;} setSaving(true);
    try{const {consent,...details}=form;await saveGuest({...details,country_code:DEPLOYMENT_COUNTRY,market_selection_source:'deployment',contact_number:phone});}catch(err){setError(err.message);setSaving(false);}
  };

  if(exempt||(guest&&guestHasConfirmedPin)) return children;
  if(!guestReady) return <GuestLoading message="Preparing your table…"/>;
  if(step==='finding') return <GuestLoading message="Finding your flavor nearby…"/>;
  return <main className="guest-onboarding"><section className="guest-card"><Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={150} height={100} priority/>
    {step==='location'?<><span className="guest-step"><MapPin size={15}/> {DEPLOYMENT_COUNTRY_NAME} ordering</span><h1>Where should we guide the feast?</h1><p>{isGhana?'Allow location access, then confirm the exact delivery pin. No typed street address needed.':'Choose your local delivery area now. You can pinpoint the exact doorstep during checkout.'}</p><form onSubmit={confirmLocation} className="guest-form">
      <label><span>Country</span><input value={DEPLOYMENT_COUNTRY_NAME} disabled aria-label="Ordering country"/></label>
      <label className="locked-market"><span>Service region <small><ShieldCheck size={12}/> This site</small></span><input value={market.region} disabled aria-label="Service region"/></label>
      {isGhana?<><button type="button" className={`map-pin-button full ${geoStatus==='locating'?'gps-locating':''}`} onClick={openMap} aria-busy={geoStatus==='locating'}>{geoStatus==='locating'?<b className="gps-scanner" aria-hidden="true"><LocateFixed/></b>:<MapPinned/>}<span><strong>{form.formatted_address?'Adjust delivery pin':geoStatus==='locating'?'Detecting your location…':'Confirm delivery pin'}</strong><small>{form.formatted_address?'Move the pin if the entrance is not exact':geoStatus==='locating'?'Finding the most accurate GPS reading':'Use your GPS, search, or move the pin on the map'}</small></span>{form.location_source==='map_pin'&&<i><CheckCircle2/> Confirmed</i>}</button>{form.formatted_address&&<div className="locked-address full"><MapPin/><span><small>Pin-selected delivery address</small><strong>{form.formatted_address}</strong></span><LockKeyhole aria-label="Locked"/></div>}{geoMessage&&<p className={`address-location-note full ${geoStatus==='locating'?'gps-detecting':''}`} role="status" aria-live="polite">{geoStatus==='locating'?<Loader2 className="spin gps-status-spinner" size={17}/>:<LocateFixed size={17}/>}<span>{geoMessage}</span></p>}</>:<><label><span>{market.cityLabel}</span><select name="city_code" value={form.city_code} onChange={chooseCity} required disabled={loadingLocations&&!cities.length}><option value="">{loadingLocations&&!cities.length?'Loading locations…':`Select ${market.cityLabel.toLowerCase()}`}</option>{cities.map((city)=><option value={city.code} key={city.code}>{city.name}</option>)}</select></label><label><span>{market.areaLabel}</span><select name="barangay" value={form.barangay} onChange={update} required disabled={!form.city_code||loadingLocations}><option value="">{loadingLocations&&form.city_code?'Loading areas…':`Select ${market.areaLabel.toLowerCase()}`}</option>{barangays.map((area)=><option value={area.name} key={area.code}>{area.name}</option>)}</select></label><label className="full"><span>House number / Street</span><input name="house_number" value={form.house_number} onChange={update} placeholder="123 Mabini Street" required/></label></>}
      <label className="full"><span>Landmark / address hint <small>Optional</small></span><input name="landmark" value={form.landmark} onChange={update} placeholder="Near a known landmark, gate color, or building"/></label>
      <p className="address-location-note full"><MapPin size={17}/><span>{isGhana?'Your GPS only suggests a starting point. Delivery uses the pin you confirm on the map.':`This website accepts ${DEPLOYMENT_COUNTRY_NAME} addresses only. Your exact map pin is used for delivery—not your phone's live location.`}</span></p>{error&&<p className="form-error full">{error}</p>}
      <button className="primary-button full" disabled={loadingLocations||(isGhana&&form.location_source!=='map_pin')}>{isGhana?'Use this delivery pin':'Find food near me'} <ArrowRight size={19}/></button>
    </form></>:<><span className="guest-step"><Sparkles size={15}/> Almost ready to feast</span><h1>Who are we guiding?</h1><p>We found your neighborhood. Tell us who should receive the delicious news.</p><form onSubmit={submitDetails} className="guest-form">
      {locationMessage&&<p className="address-result full"><MapPin size={17}/>{locationMessage}</p>}<label className="full"><span>Customer name</span><input name="customer_name" value={form.customer_name} onChange={update} autoComplete="name" required/></label><label className="full"><span>Customer email</span><input type="email" name="customer_email" value={form.customer_email} onChange={update} autoComplete="email" required/></label><label className="full"><span>Customer contact</span><input name="contact_number" value={form.contact_number} onChange={update} inputMode="tel" autoComplete="tel" required/></label><label className="consent-box full"><input type="checkbox" name="consent" checked={form.consent} onChange={update}/><ShieldCheck size={21}/><span>By submitting my details, I consent to their use for order processing, address-based distance estimates, and delivery only. Information will be handled securely and not shared beyond what is necessary to complete the transaction.</span></label>{error&&<p className="form-error full">{error}</p>}<button className="primary-button full" disabled={saving}>{saving?<><Loader2 className="spin"/> Saving your seat…</>:<>Take me to the feast <ArrowRight size={19}/></>}</button>
    </form></>}
  </section>{isGhana&&mapOpen&&<LocationPinModal marketCode={form.market_code} latitude={form.latitude} longitude={form.longitude} locationAccuracy={form.location_accuracy} address={form.formatted_address} initialLocation={{city:form.city,barangay:form.barangay,house_number:form.house_number}} onClose={closeMap} onConfirm={applyPinnedLocation}/>}</main>;
}

function GuestLoading({message}){return <main className="guest-finding"><MapPin size={46}/><h1>{message}</h1><p>Good food is just around the corner.</p><div className="loading-dots"><i/><i/><i/></div></main>;}
