'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, LockKeyhole, MapPin, Save, UserRound, X } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';
import { getMarket, MARKET_OPTIONS, normalizeMarketCode } from '@/lib/markets';

export default function GuestGreeting() {
  const { guest, updateGuest } = useGuest();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !guest) return;
    const marketCode=normalizeMarketCode(guest.market_code);
    const market=getMarket(marketCode);
    setForm({ ...guest, market_code:marketCode, country_code:market.countryCode, contact_number:guest.contact_number || market.phonePrefix });
    setError('');
    setLoadingLocations(true);
    fetch(`/api/locations?market=${encodeURIComponent(marketCode)}`)
      .then((response) => response.json())
      .then(async (rows) => {
        if (!Array.isArray(rows)) throw new Error('Could not load delivery locations.');
        setCities(rows);
        const cityCode = guest.city_code || rows.find((city) => city.name === guest.city)?.code || '';
        setForm((current) => ({ ...current, city_code: cityCode }));
        if (cityCode) {
          const barangayResponse = await fetch(`/api/locations?market=${encodeURIComponent(marketCode)}&city=${encodeURIComponent(cityCode)}`);
          const barangayRows = await barangayResponse.json();
          if (Array.isArray(barangayRows)) setBarangays(barangayRows);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLocations(false));
  }, [open, guest]);

  if (!guest) return null;
  const firstName = guest.customer_name?.trim().split(/\s+/)[0] || 'there';
  const market = getMarket(form?.market_code || guest.market_code);
  const gpsMarketLocked = guest.market_selection_source === 'gps';
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const chooseCity = async (event) => {
    const cityCode = event.target.value;
    const city = cities.find((entry) => entry.code === cityCode)?.name || '';
    setForm((current) => ({ ...current, city_code: cityCode, city, barangay: '', latitude:null, longitude:null, location_source:null }));
    setBarangays([]); setLoadingLocations(true); setError('');
    try {
      const response = await fetch(`/api/locations?market=${encodeURIComponent(form.market_code)}&city=${encodeURIComponent(cityCode)}`);
      const rows = await response.json();
      if (!response.ok || !Array.isArray(rows)) throw new Error(rows.error || 'Could not load barangays.');
      setBarangays(rows);
    } catch (err) { setError(err.message); }
    finally { setLoadingLocations(false); }
  };

  const chooseMarket = async (event) => {
    const marketCode=event.target.value; const nextMarket=getMarket(marketCode);
    setForm((current)=>({...current,market_code:marketCode,country_code:nextMarket.countryCode,contact_number:nextMarket.phonePrefix,city:'',city_code:'',barangay:'',digital_address:'',latitude:null,longitude:null,location_source:null}));
    setCities([]); setBarangays([]); setLoadingLocations(true); setError('');
    try{const response=await fetch(`/api/locations?market=${encodeURIComponent(marketCode)}`);const rows=await response.json();if(!response.ok||!Array.isArray(rows))throw new Error(rows.error||'Could not load delivery locations.');setCities(rows);}catch(err){setError(err.message);}finally{setLoadingLocations(false);}
  };
  const chooseCountry = (event) => {
    const firstMarket=MARKET_OPTIONS.find((option)=>option.countryCode===event.target.value);
    if(firstMarket) chooseMarket({ target:{ value:firstMarket.code } });
  };

  const save = async (event) => {
    event.preventDefault(); setError('');
    const phone=String(form.contact_number||'').replace(/\s/g,'');
    const valid=form.market_code.startsWith('gh-')?/^\+233\d{9}$/.test(phone):/^\+63\d{10}$/.test(phone);
    if (!valid) {
      setError(`Use a valid ${market.country} number beginning with ${market.phonePrefix}.`); return;
    }
    setSaving(true);
    try {
      let next = { ...form, contact_number: phone };
      const locationResponse = await fetch('/api/geocode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city:next.city, barangay:next.barangay, market_code:next.market_code }),
      });
      const locationResult = await locationResponse.json();
      if (locationResponse.ok && locationResult.location) next = {
        ...next,
        latitude: locationResult.location.latitude,
        longitude: locationResult.location.longitude,
        location_accuracy: null,
        location_source: 'address',
      };
      await updateGuest(next);
      setOpen(false);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return <>
    <button className="guest-greeting" onClick={() => setOpen(true)} aria-label="Edit your guest details">
      <span>Hello, {firstName}!</span>
      <small><MapPin size={13} /> {guest.barangay}, {guest.city} · {getMarket(guest.market_code).country}</small>
    </button>
    {open && form && createPortal(<div className="profile-modal-bg" onMouseDown={(event) => { if(event.target===event.currentTarget) setOpen(false); }}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <header><div><p className="kicker">Your saved details</p><h2 id="profile-title">Update your guide card</h2></div><button onClick={() => setOpen(false)} aria-label="Close"><X/></button></header>
        <form onSubmit={save} className="profile-form">
          <label className={gpsMarketLocked?'locked-market':''}><span>Country {gpsMarketLocked&&<small><LockKeyhole size={12}/> GPS</small>}</span><select value={market.countryCode} onChange={chooseCountry} disabled={gpsMarketLocked}><option value="PH">Philippines</option><option value="GH">Ghana</option></select></label>
          <label className={gpsMarketLocked?'locked-market':''}><span>Region {gpsMarketLocked&&<small><LockKeyhole size={12}/> GPS</small>}</span><select name="market_code" value={form.market_code} onChange={chooseMarket} disabled={gpsMarketLocked}>{MARKET_OPTIONS.filter((option)=>option.countryCode===market.countryCode).map((option)=><option value={option.code} key={option.code}>{option.region}</option>)}</select></label>
          {gpsMarketLocked&&<p className="profile-market-lock-note full"><LockKeyhole size={16}/> Country and region were detected by GPS and are locked. Your delivery address can still be updated.</p>}
          <label className="full"><span>Customer name</span><input name="customer_name" value={form.customer_name||''} onChange={update} required /></label>
          <label className="full"><span>Email</span><input type="email" name="customer_email" value={form.customer_email||''} onChange={update} required /></label>
          <label className="full"><span>Contact number</span><input name="contact_number" value={form.contact_number||''} onChange={update} inputMode="tel" required /></label>
          <label><span>{market.cityLabel}</span><select name="city_code" value={form.city_code||''} onChange={chooseCity} disabled={loadingLocations&&!cities.length} required><option value="">Select location</option>{cities.map((city)=><option value={city.code} key={city.code}>{city.name}</option>)}</select></label>
          <label><span>{market.areaLabel}</span><select name="barangay" value={form.barangay||''} onChange={(event)=>setForm((current)=>({...current,barangay:event.target.value,latitude:null,longitude:null,location_source:null}))} disabled={!form.city_code||loadingLocations} required><option value="">Select area</option>{barangays.map((barangay)=><option value={barangay.name} key={barangay.code}>{barangay.name}</option>)}</select></label>
          <label className="full"><span>House number / Street</span><input name="house_number" value={form.house_number||''} onChange={update} required /></label>
          <label className="full"><span>Landmark / address hint <small>Optional</small></span><input name="landmark" value={form.landmark||''} onChange={update} placeholder="Near the barangay hall, blue gate" /></label>
          {market.digitalAddress&&<label className="full"><span>GhanaPost GPS digital address <small>Optional</small></span><input name="digital_address" value={form.digital_address||''} onChange={update} placeholder="Example: GA-123-4567" /></label>}
          <p className="profile-privacy full"><UserRound size={17}/> Changes are saved to this browser and your secure guest profile. Distance uses only the selected city and barangay.</p>
          {error&&<p className="form-error full">{error}</p>}
          <footer className="full"><button type="button" className="secondary-button" onClick={()=>setOpen(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving?<Loader2 className="spin"/>:<Save/>}{saving?'Saving…':'Save details'}</button></footer>
        </form>
      </section>
    </div>, document.body)}
  </>;
}
