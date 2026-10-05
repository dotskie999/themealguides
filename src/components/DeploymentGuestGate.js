'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Loader2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { getMarket } from '@/lib/markets';
import { DEFAULT_DEPLOYMENT_MARKET, DEPLOYMENT_COUNTRY, DEPLOYMENT_COUNTRY_NAME } from '@/lib/deployment';

const defaultMarket=getMarket(DEFAULT_DEPLOYMENT_MARKET);
const initialForm = {
  market_code:DEFAULT_DEPLOYMENT_MARKET, market_selection_source:'deployment', country_code:DEPLOYMENT_COUNTRY,
  city:'', city_code:'', barangay:'', house_number:'', landmark:'', digital_address:'',
  customer_name:'', customer_email:'', contact_number:defaultMarket.phonePrefix, consent:false,
  latitude:null, longitude:null, location_accuracy:null, location_source:null,
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
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const exempt = pathname.startsWith('/admin') || pathname.startsWith('/receipt/');
  const market = getMarket(form.market_code);

  useEffect(() => {
    if (exempt || guest || !guestReady || step !== 'location' || !form.market_code) return;
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
  }, [exempt, guest, guestReady, step, form.market_code]);

  const update = (event) => { const { name,value,checked,type }=event.target; setForm((current)=>({...current,[name]:type==='checkbox'?checked:value})); };
  const chooseCity = async (event) => {
    const cityCode=event.target.value; const city=cities.find((entry)=>entry.code===cityCode)?.name||'';
    setForm((current)=>({...current,city_code:cityCode,city,barangay:'',latitude:null,longitude:null,location_source:null})); setBarangays([]);
    if(!cityCode) return; setLoadingLocations(true); setError('');
    try { const response=await fetch(`/api/locations?market=${encodeURIComponent(form.market_code)}&city=${encodeURIComponent(cityCode)}`); const result=await response.json(); if(!response.ok||!Array.isArray(result)) throw new Error(result.error||'Could not load local areas.'); setBarangays(result); }
    catch(err){setError(err.message);} finally{setLoadingLocations(false);}
  };
  const confirmLocation = async (event) => {
    event.preventDefault(); setError(''); setStep('finding'); const startedAt=Date.now();
    try { const response=await fetch('/api/geocode',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({city:form.city,barangay:form.barangay,market_code:form.market_code})}); const result=await response.json(); if(!response.ok) throw new Error(result.error||'Address lookup unavailable.'); if(result.location){setForm((current)=>({...current,latitude:result.location.latitude,longitude:result.location.longitude,location_accuracy:null,location_source:'address'}));setLocationMessage('We found your selected delivery area. You can confirm the exact pin during checkout.');}else setLocationMessage('Your address is saved. You can confirm the exact pin during checkout.'); }
    catch{setLocationMessage('Your address is saved. You can confirm the exact pin during checkout.');}
    finally{window.setTimeout(()=>setStep('details'),Math.max(0,1000-(Date.now()-startedAt)));}
  };
  const submitDetails = async (event) => {
    event.preventDefault(); setError(''); if(!form.consent){setError('Please confirm your consent to continue.');return;} const phone=form.contact_number.replace(/\s/g,'');
    if(!validPhone(phone)){setError(`Use a valid ${market.country} number beginning with ${market.phonePrefix}.`);return;} setSaving(true);
    try{const {consent,...details}=form;await saveGuest({...details,country_code:DEPLOYMENT_COUNTRY,market_selection_source:'deployment',contact_number:phone});}catch(err){setError(err.message);setSaving(false);}
  };

  if(exempt||guest) return children;
  if(!guestReady) return <GuestLoading message="Preparing your table…"/>;
  if(step==='finding') return <GuestLoading message="Finding your flavor nearby…"/>;
  return <main className="guest-onboarding"><section className="guest-card"><Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={150} height={100} priority/>
    {step==='location'?<><span className="guest-step"><MapPin size={15}/> {DEPLOYMENT_COUNTRY_NAME} ordering</span><h1>Where should we guide the feast?</h1><p>Choose your local delivery area now. You can pinpoint the exact doorstep during checkout.</p><form onSubmit={confirmLocation} className="guest-form">
      <label><span>Country</span><input value={DEPLOYMENT_COUNTRY_NAME} disabled aria-label="Ordering country"/></label>
      <label className="locked-market"><span>Service region <small><ShieldCheck size={12}/> This site</small></span><input value={market.region} disabled aria-label="Service region"/></label>
      <label><span>{market.cityLabel}</span><select name="city_code" value={form.city_code} onChange={chooseCity} required disabled={loadingLocations&&!cities.length}><option value="">{loadingLocations&&!cities.length?'Loading locations…':`Select ${market.cityLabel.toLowerCase()}`}</option>{cities.map((city)=><option value={city.code} key={city.code}>{city.name}</option>)}</select></label>
      <label><span>{market.areaLabel}</span><select name="barangay" value={form.barangay} onChange={update} required disabled={!form.city_code||loadingLocations}><option value="">{loadingLocations&&form.city_code?'Loading areas…':`Select ${market.areaLabel.toLowerCase()}`}</option>{barangays.map((area)=><option value={area.name} key={area.code}>{area.name}</option>)}</select></label>
      <label className="full"><span>House number / Street</span><input name="house_number" value={form.house_number} onChange={update} placeholder={DEPLOYMENT_COUNTRY==='GH'?'House number and street':'123 Mabini Street'} required/></label>
      <label className="full"><span>Landmark / address hint <small>Optional</small></span><input name="landmark" value={form.landmark} onChange={update} placeholder="Near a known landmark, gate color, or building"/></label>
      {market.digitalAddress&&<label className="full"><span>GhanaPost GPS digital address <small>Optional</small></span><input name="digital_address" value={form.digital_address} onChange={update} placeholder="Example: GA-123-4567"/></label>}
      <p className="address-location-note full"><MapPin size={17}/><span>This website accepts {DEPLOYMENT_COUNTRY_NAME} addresses only. Your exact map pin is used for delivery—not your phone&apos;s live location.</span></p>{error&&<p className="form-error full">{error}</p>}
      <button className="primary-button full" disabled={loadingLocations}>Find food near me <ArrowRight size={19}/></button>
    </form></>:<><span className="guest-step"><Sparkles size={15}/> Almost ready to feast</span><h1>Who are we guiding?</h1><p>We found your neighborhood. Tell us who should receive the delicious news.</p><form onSubmit={submitDetails} className="guest-form">
      {locationMessage&&<p className="address-result full"><MapPin size={17}/>{locationMessage}</p>}<label className="full"><span>Customer name</span><input name="customer_name" value={form.customer_name} onChange={update} autoComplete="name" required/></label><label className="full"><span>Customer email</span><input type="email" name="customer_email" value={form.customer_email} onChange={update} autoComplete="email" required/></label><label className="full"><span>Customer contact</span><input name="contact_number" value={form.contact_number} onChange={update} inputMode="tel" autoComplete="tel" required/></label><label className="consent-box full"><input type="checkbox" name="consent" checked={form.consent} onChange={update}/><ShieldCheck size={21}/><span>By submitting my details, I consent to their use for order processing, address-based distance estimates, and delivery only. Information will be handled securely and not shared beyond what is necessary to complete the transaction.</span></label>{error&&<p className="form-error full">{error}</p>}<button className="primary-button full" disabled={saving}>{saving?<><Loader2 className="spin"/> Saving your seat…</>:<>Take me to the feast <ArrowRight size={19}/></>}</button>
    </form></>}
  </section></main>;
}

function GuestLoading({message}){return <main className="guest-finding"><MapPin size={46}/><h1>{message}</h1><p>Good food is just around the corner.</p><div className="loading-dots"><i/><i/><i/></div></main>;}
