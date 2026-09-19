'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Loader2, MapPin, Navigation, ShieldCheck, Sparkles } from 'lucide-react';
import { useGuest } from '@/context/GuestContext';

const initialForm = {
  city: '', city_code: '', barangay: '', house_number: '', landmark: '',
  customer_name: '', customer_email: '', contact_number: '+63', consent: false,
  latitude: null, longitude: null, location_accuracy: null, location_source: null,
};

export default function GuestGate({ children }) {
  const pathname = usePathname();
  const { guest, guestReady, saveGuest } = useGuest();
  const [step, setStep] = useState('location');
  const [form, setForm] = useState(initialForm);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const exempt = pathname.startsWith('/admin') || pathname.startsWith('/receipt/');

  useEffect(() => {
    if (exempt || guest || !guestReady) return;
    fetch('/api/locations')
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'Could not load cities.');
        setCities(result);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingLocations(false));
  }, [exempt, guest, guestReady]);

  const update = (event) => {
    const { name, value, checked, type } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const chooseCity = async (event) => {
    const cityCode = event.target.value;
    const city = cities.find((entry) => entry.code === cityCode)?.name || '';
    setForm((current) => ({ ...current, city_code: cityCode, city, barangay: '' }));
    setBarangays([]);
    if (!cityCode) return;
    setLoadingLocations(true); setError('');
    try {
      const response = await fetch(`/api/locations?city=${encodeURIComponent(cityCode)}`);
      const result = await response.json();
      if (!response.ok || !Array.isArray(result)) throw new Error(result.error || 'Could not load barangays.');
      setBarangays(result);
    } catch (err) { setError(err.message); }
    finally { setLoadingLocations(false); }
  };

  const confirmLocation = async (event) => {
    event.preventDefault();
    setError('');
    setStep('finding');
    const startedAt = Date.now();
    try {
      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: form.city, barangay: form.barangay }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Address lookup unavailable.');
      if (result.location) {
        setForm((current) => ({
          ...current,
          latitude: result.location.latitude,
          longitude: result.location.longitude,
          location_accuracy: null,
          location_source: 'address',
        }));
        setLocationMessage('Distance will be estimated from the center of your delivery area.');
      } else {
        setLocationMessage('Your address is saved, but a distance estimate is not available for this area yet.');
      }
    } catch {
      setLocationMessage('Your address is saved, but distance lookup is temporarily unavailable.');
    } finally {
      const remaining = Math.max(0, 1000 - (Date.now() - startedAt));
      window.setTimeout(() => setStep('details'), remaining);
    }
  };

  const submitDetails = async (event) => {
    event.preventDefault(); setError('');
    if (!form.consent) { setError('Please confirm your consent to continue.'); return; }
    if (!/^\+63\d{10}$/.test(form.contact_number.replace(/\s/g, ''))) {
      setError('Use a valid Philippine number, such as +639171234567.'); return;
    }
    setSaving(true);
    try {
      const { consent, ...details } = form;
      await saveGuest({ ...details, contact_number: details.contact_number.replace(/\s/g, '') });
    } catch (err) { setError(err.message); setSaving(false); }
  };

  if (exempt || guest) return children;
  if (!guestReady) return <GuestLoading message="Preparing your table…" />;
  if (step === 'finding') return <GuestLoading message="Finding your flavor nearby…" />;

  return <main className="guest-onboarding">
    <section className="guest-card">
      <Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={150} height={100} priority />
      {step === 'location' ? <>
        <span className="guest-step"><Navigation size={15} /> First, your delivery spot</span>
        <h1>Where should we guide the feast?</h1>
        <p>Your doorstep is the coordinate, and your taste buds are the boss!</p>
        <form onSubmit={confirmLocation} className="guest-form">
          <label><span>City / Municipality</span><select name="city_code" value={form.city_code} onChange={chooseCity} required disabled={loadingLocations && !cities.length}><option value="">{loadingLocations && !cities.length ? 'Loading cities…' : 'Select your city'}</option>{cities.map((city) => <option value={city.code} key={city.code}>{city.name}</option>)}</select></label>
          <label><span>Barangay</span><select name="barangay" value={form.barangay} onChange={update} required disabled={!form.city_code || loadingLocations}><option value="">{loadingLocations && form.city_code ? 'Loading barangays…' : 'Select your barangay'}</option>{barangays.map((barangay) => <option value={barangay.name} key={barangay.code}>{barangay.name}</option>)}</select></label>
          <label className="full"><span>House number / Street</span><input name="house_number" value={form.house_number} onChange={update} placeholder="123 Mabini Street" required /></label>
          <label className="full"><span>Landmark / address hint <small>Optional</small></span><input name="landmark" value={form.landmark} onChange={update} placeholder="Near the barangay hall, blue gate" /></label>
          <p className="address-location-note full"><MapPin size={17}/><span>Distance is estimated from your selected city and barangay—not your phone&apos;s live location. Your house/street is never sent for map lookup.</span></p>
          {error && <p className="form-error full">{error}</p>}
          <button className="primary-button full" disabled={loadingLocations}>Find food near me <ArrowRight size={19} /></button>
        </form>
      </> : <>
        <span className="guest-step"><Sparkles size={15} /> Almost ready to feast</span>
        <h1>Who are we guiding?</h1>
        <p>We found your neighborhood. Tell us who should receive the delicious news.</p>
        <form onSubmit={submitDetails} className="guest-form">
          {locationMessage&&<p className="address-result full"><MapPin size={17}/>{locationMessage}</p>}
          <label className="full"><span>Customer name</span><input name="customer_name" value={form.customer_name} onChange={update} autoComplete="name" required /></label>
          <label className="full"><span>Customer email</span><input type="email" name="customer_email" value={form.customer_email} onChange={update} autoComplete="email" required /></label>
          <label className="full"><span>Customer contact</span><input name="contact_number" value={form.contact_number} onChange={update} inputMode="tel" autoComplete="tel" required /></label>
          <label className="consent-box full"><input type="checkbox" name="consent" checked={form.consent} onChange={update} /><ShieldCheck size={21} /><span>By submitting my details, I consent to their use for order processing, address-based distance estimates, and delivery only. Information will be handled securely and not shared beyond what is necessary to complete the transaction.</span></label>
          {error && <p className="form-error full">{error}</p>}
          <button className="primary-button full" disabled={saving}>{saving ? <><Loader2 className="spin" /> Saving your seat…</> : <>Take me to the feast <ArrowRight size={19} /></>}</button>
        </form>
      </>}
    </section>
  </main>;
}

function GuestLoading({ message }) {
  return <main className="guest-finding"><MapPin size={46} /><h1>{message}</h1><p>Good food is just around the corner.</p><div className="loading-dots"><i /><i /><i /></div></main>;
}
