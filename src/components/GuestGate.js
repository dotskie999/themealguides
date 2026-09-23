'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Globe2, Loader2, MapPin, Navigation, ShieldCheck, Sparkles } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { detectMarketFromCoordinates, getMarket, MARKET_OPTIONS } from '@/lib/markets';

const initialForm = {
  market_code:'', market_selection_source:'', country_code:'', city:'', city_code:'', barangay:'', house_number:'', landmark:'', digital_address:'',
  customer_name:'', customer_email:'', contact_number:'', consent:false,
  latitude:null, longitude:null, location_accuracy:null, location_source:null,
};
const validPhone = (phone, marketCode) => marketCode.startsWith('gh-') ? /^\+233\d{9}$/.test(phone) : /^\+63\d{10}$/.test(phone);

export default function GuestGate({ children }) {
  const pathname = usePathname();
  const { guest, guestReady, saveGuest } = useGuest();
  const [step, setStep] = useState('market');
  const [form, setForm] = useState(initialForm);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [detectionStatus, setDetectionStatus] = useState('idle');
  const [detectionMessage, setDetectionMessage] = useState('');
  const [error, setError] = useState('');
  const marketChoiceMade = useRef(false);
  const exempt = pathname.startsWith('/admin') || pathname.startsWith('/receipt/');
  const market = form.market_code ? getMarket(form.market_code) : getMarket(form.country_code==='GH'?'gh-accra':'ph-ncr');
  const gpsMarketLocked = form.market_selection_source === 'gps';

  useEffect(() => {
    if (exempt || guest || !guestReady || step !== 'location' || !form.market_code) return;
    setLoadingLocations(true); setError('');
    fetch(`/api/locations?market=${encodeURIComponent(form.market_code)}`)
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'Could not load delivery areas.');
        setCities(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLocations(false));
  }, [exempt, guest, guestReady, step, form.market_code]);

  const update = (event) => { const { name,value,checked,type }=event.target; setForm((current)=>({...current,[name]:type==='checkbox'?checked:value})); };
  const chooseMarket = useCallback((marketCode, source='manual') => {
    marketChoiceMade.current=true;
    if(source==='manual') setDetectionStatus('manual');
    const chosen=getMarket(marketCode);
    setForm((current)=>({...current,market_code:chosen.code,market_selection_source:source,country_code:chosen.countryCode,contact_number:chosen.phonePrefix,city:'',city_code:'',barangay:'',latitude:null,longitude:null,location_source:null}));
    setCities([]); setBarangays([]); setError('');
    setDetectionMessage(source==='gps'?`${chosen.label} was selected from your device location. Your delivery address will still determine distance.`:'');
    setStep('location');
  }, []);
  const chooseCountry = useCallback((countryCode) => {
    if(countryCode==='PH'){chooseMarket('ph-ncr','manual');return;}
    marketChoiceMade.current=true; setDetectionStatus('manual'); setDetectionMessage('');
    setForm((current)=>({...current,country_code:'GH',market_code:'',market_selection_source:'manual',contact_number:'+233',city:'',city_code:'',barangay:'',digital_address:'',latitude:null,longitude:null,location_source:null}));
    setCities([]); setBarangays([]); setError(''); setStep('location');
  }, [chooseMarket]);
  const requestMarketDetection = useCallback(() => {
    marketChoiceMade.current=false;
    if(!navigator.geolocation){setDetectionStatus('unavailable');setDetectionMessage('Location detection is not available in this browser. Choose your country below.');return;}
    setDetectionStatus('requesting'); setDetectionMessage('Allow location access in your browser to find the correct market.'); setError('');
    navigator.geolocation.getCurrentPosition((position)=>{
      if(marketChoiceMade.current) return;
      const result=detectMarketFromCoordinates(position.coords.latitude,position.coords.longitude);
      if(result.marketCode){setDetectionStatus('detected');chooseMarket(result.marketCode,'gps');return;}
      setDetectionStatus('outside');
      setDetectionMessage(result.countryCode==='PH'?'We detected the Philippines, but you appear to be outside our Metro Manila launch area.':result.countryCode==='GH'?'We detected Ghana, but you appear to be outside our Accra and Tema launch areas.':'We could not match your location to a supported market.');
    },(locationError)=>{
      if(marketChoiceMade.current) return;
      setDetectionStatus(locationError.code===1?'denied':'unavailable');
      setDetectionMessage(locationError.code===1?'Location access was not enabled. No problem—choose your country below.':'We could not detect your location. Choose your country below.');
    },{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
  }, [chooseMarket]);
  useEffect(() => {
    if(exempt||guest||!guestReady||step!=='market'||detectionStatus!=='idle') return;
    requestMarketDetection();
  }, [exempt,guest,guestReady,step,detectionStatus,requestMarketDetection]);
  const chooseCity = async (event) => {
    const cityCode=event.target.value; const city=cities.find((entry)=>entry.code===cityCode)?.name||'';
    setForm((current)=>({...current,city_code:cityCode,city,barangay:'',latitude:null,longitude:null,location_source:null})); setBarangays([]);
    if(!cityCode) return; setLoadingLocations(true); setError('');
    try { const response=await fetch(`/api/locations?market=${encodeURIComponent(form.market_code)}&city=${encodeURIComponent(cityCode)}`); const result=await response.json(); if(!response.ok||!Array.isArray(result)) throw new Error(result.error||'Could not load local areas.'); setBarangays(result); }
    catch(err){setError(err.message);} finally{setLoadingLocations(false);}
  };
  const confirmLocation = async (event) => {
    event.preventDefault(); setError(''); setStep('finding'); const startedAt=Date.now();
    try { const response=await fetch('/api/geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({city:form.city,barangay:form.barangay,market_code:form.market_code})}); const result=await response.json(); if(!response.ok) throw new Error(result.error||'Address lookup unavailable.'); if(result.location){setForm((current)=>({...current,latitude:result.location.latitude,longitude:result.location.longitude,location_accuracy:null,location_source:'address'}));setLocationMessage('Distance will be estimated from the center of your selected delivery area.');}else setLocationMessage('Your address is saved, but a distance estimate is not available for this area yet.'); }
    catch{setLocationMessage('Your address is saved, but distance lookup is temporarily unavailable.');}
    finally{window.setTimeout(()=>setStep('details'),Math.max(0,1000-(Date.now()-startedAt)));}
  };
  const submitDetails = async (event) => {
    event.preventDefault(); setError(''); if(!form.consent){setError('Please confirm your consent to continue.');return;} const phone=form.contact_number.replace(/\s/g,'');
    if(!validPhone(phone,form.market_code)){setError(`Use a valid ${market.country} number beginning with ${market.phonePrefix}.`);return;} setSaving(true);
    try{const {consent,...details}=form;await saveGuest({...details,contact_number:phone});}catch(err){setError(err.message);setSaving(false);}
  };

  if(exempt||guest) return children;
  if(!guestReady) return <GuestLoading message="Preparing your table…"/>;
  if(step==='finding') return <GuestLoading message="Finding your flavor nearby…"/>;
  return <main className="guest-onboarding"><section className="guest-card"><Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={150} height={100} priority/>
    {step==='market'?<><span className="guest-step"><Globe2 size={15}/> Find your market</span><h1>Where are you ordering from?</h1><p>We&apos;ll try to identify your market from your device location. Your live GPS coordinates are not saved.</p><div className={`market-detection ${detectionStatus}`}><Navigation size={21}/><div><strong>{detectionStatus==='requesting'?'Waiting for location permission…':'Automatic market detection'}</strong><small>{detectionMessage||'Use your location to select the correct country and launch area.'}</small></div>{detectionStatus!=='requesting'&&<button type="button" onClick={requestMarketDetection}>Try again</button>}</div><div className="manual-divider"><span>or choose manually</span></div><div className="market-picker"><button onClick={()=>chooseCountry('PH')}><span>PH</span><div><strong>Philippines</strong><small>Select country</small></div><ArrowRight/></button><button onClick={()=>chooseCountry('GH')}><span>GH</span><div><strong>Ghana</strong><small>Select country</small></div><ArrowRight/></button></div></>:step==='location'?<>
      <span className="guest-step"><Navigation size={15}/> {form.market_code?market.label:market.country}</span><h1>Where should we guide the feast?</h1><p>Your doorstep is the coordinate, and your taste buds are the boss!</p><form onSubmit={confirmLocation} className="guest-form">
        <label><span>Country</span><select value={form.country_code} onChange={(event)=>chooseCountry(event.target.value)} disabled={gpsMarketLocked} required><option value="PH">Philippines</option><option value="GH">Ghana</option></select></label>
        <label><span>Region</span><select value={form.market_code} onChange={(event)=>chooseMarket(event.target.value,form.market_selection_source||'manual')} disabled={gpsMarketLocked} required><option value="">Select region</option>{MARKET_OPTIONS.filter(option=>option.countryCode===form.country_code).map(option=><option value={option.code} key={option.code}>{option.region}</option>)}</select></label>
        <label><span>{market.cityLabel}</span><select name="city_code" value={form.city_code} onChange={chooseCity} required disabled={!form.market_code||(loadingLocations&&!cities.length)}><option value="">{loadingLocations&&!cities.length?'Loading locations…':`Select ${market.cityLabel.toLowerCase()}`}</option>{cities.map((city)=><option value={city.code} key={city.code}>{city.name}</option>)}</select></label>
        <label><span>{market.areaLabel}</span><select name="barangay" value={form.barangay} onChange={update} required disabled={!form.city_code||loadingLocations}><option value="">{loadingLocations&&form.city_code?'Loading areas…':`Select ${market.areaLabel.toLowerCase()}`}</option>{barangays.map((area)=><option value={area.name} key={area.code}>{area.name}</option>)}</select></label>
        <label className="full"><span>House number / Street</span><input name="house_number" value={form.house_number} onChange={update} placeholder={market.countryCode==='GH'?'House number and street':'123 Mabini Street'} required/></label>
        <label className="full"><span>Landmark / address hint <small>Optional</small></span><input name="landmark" value={form.landmark} onChange={update} placeholder="Near a known landmark, gate color, or building"/></label>
        {market.digitalAddress&&<label className="full"><span>GhanaPost GPS digital address <small>Optional</small></span><input name="digital_address" value={form.digital_address} onChange={update} placeholder="Example: GA-123-4567"/></label>}
        {detectionMessage&&<p className="address-result full"><Navigation size={17}/><span>{detectionMessage}</span></p>}<p className="address-location-note full"><MapPin size={17}/><span>Distance uses your selected delivery area—not your phone&apos;s live location. Your street and landmark are never sent for map lookup.</span></p>{error&&<p className="form-error full">{error}</p>}
        <div className="guest-form-actions full"><button type="button" className="secondary-button" onClick={()=>setStep('market')}>Change country</button><button className="primary-button" disabled={loadingLocations||!form.market_code}>Find food near me <ArrowRight size={19}/></button></div>
      </form></>:<><span className="guest-step"><Sparkles size={15}/> Almost ready to feast</span><h1>Who are we guiding?</h1><p>We found your neighborhood. Tell us who should receive the delicious news.</p><form onSubmit={submitDetails} className="guest-form">
        {locationMessage&&<p className="address-result full"><MapPin size={17}/>{locationMessage}</p>}<label className="full"><span>Customer name</span><input name="customer_name" value={form.customer_name} onChange={update} autoComplete="name" required/></label><label className="full"><span>Customer email</span><input type="email" name="customer_email" value={form.customer_email} onChange={update} autoComplete="email" required/></label><label className="full"><span>Customer contact</span><input name="contact_number" value={form.contact_number} onChange={update} inputMode="tel" autoComplete="tel" required/></label><label className="consent-box full"><input type="checkbox" name="consent" checked={form.consent} onChange={update}/><ShieldCheck size={21}/><span>By submitting my details, I consent to their use for order processing, address-based distance estimates, and delivery only. Information will be handled securely and not shared beyond what is necessary to complete the transaction.</span></label>{error&&<p className="form-error full">{error}</p>}<button className="primary-button full" disabled={saving}>{saving?<><Loader2 className="spin"/> Saving your seat…</>:<>Take me to the feast <ArrowRight size={19}/></>}</button>
      </form></>}
  </section></main>;
}

function GuestLoading({message}){return <main className="guest-finding"><MapPin size={46}/><h1>{message}</h1><p>Good food is just around the corner.</p><div className="loading-dots"><i/><i/><i/></div></main>;}
