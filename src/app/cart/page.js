'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Loader2, MapPin, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useGuest } from '@/context/GuestContext';
import { restaurantSlug } from '@/lib/restaurant';
import { getMarket, marketMoney, normalizeMarketCode } from '@/lib/markets';

const initialForm = { market_code:'ph-ncr', country_code:'PH', customer_name:'', customer_email:'', contact_number:'+63', city:'', city_code:'', barangay:'', house_number:'', landmark:'', digital_address:'', order_remarks:'', latitude:null, longitude:null, location_accuracy:null, location_source:null };

export default function CartPage() {
  const { items, ready, subtotal, removeItem, clearCart, saveOrder } = useCart();
  const { guest } = useGuest();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const router = useRouter();
  const marketCode=normalizeMarketCode(form.market_code||guest?.market_code);
  const market=getMarket(marketCode);
  const money=(value)=>marketMoney(value,marketCode);
  const update = (event) => setForm((current) => ({
    ...current,
    [event.target.name]: event.target.value,
    ...(event.target.name === 'barangay' ? { latitude:null, longitude:null, location_source:null } : {}),
  }));

  useEffect(() => {
    const controller = new AbortController();
    async function loadCities() {
      setLocationError('');
      try {
        const response = await fetch(`/api/locations?market=${encodeURIComponent(marketCode)}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load delivery locations.');
        if (!Array.isArray(result)) throw new Error('The location service returned invalid data.');
        setCities(result);
      } catch (err) {
        if (err.name !== 'AbortError') setLocationError(err.message);
      } finally {
        if (!controller.signal.aborted) setLocationsLoading(false);
      }
    }
    loadCities();
    return () => controller.abort();
  }, [marketCode]);
  useEffect(() => {
    if (!guest) return;
    setForm((current) => ({
      ...current,
      customer_name: guest.customer_name || '',
      market_code: normalizeMarketCode(guest.market_code),
      country_code: guest.country_code || getMarket(guest.market_code).countryCode,
      customer_email: guest.customer_email || '',
      contact_number: guest.contact_number || '+63',
      city: guest.city || '',
      city_code: guest.city_code || '',
      barangay: guest.barangay || '',
      house_number: guest.house_number || '',
      landmark: guest.landmark || '',
      digital_address: guest.digital_address || '',
      latitude: guest.latitude ?? null,
      longitude: guest.longitude ?? null,
      location_accuracy: guest.location_accuracy ?? null,
      location_source: guest.location_source || null,
    }));
    if (guest.city_code) {
      fetch(`/api/locations?market=${encodeURIComponent(normalizeMarketCode(guest.market_code))}&city=${encodeURIComponent(guest.city_code)}`)
        .then((response) => response.json())
        .then((rows) => { if (Array.isArray(rows)) setBarangays(rows); })
        .catch(() => {});
    }
  }, [guest]);
  const chooseCity = async (event) => {
    const city_code = event.target.value;
    const city = cities.find(entry => entry.code === city_code)?.name || '';
    setForm(current => ({ ...current, city_code, city, barangay: '', latitude:null, longitude:null, location_source:null }));
    setBarangays([]); setLocationsLoading(true); setLocationError('');
    try {
      const response = await fetch(`/api/locations?market=${encodeURIComponent(marketCode)}&city=${encodeURIComponent(city_code)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load barangays.');
      if (!Array.isArray(result)) throw new Error('The location service returned invalid data.');
      setBarangays(result);
    } catch (err) {
      setLocationError(err.message);
    } finally { setLocationsLoading(false); }
  };

  const submit = async (event) => {
    event.preventDefault(); setError('');
    const contact=form.contact_number.replace(/\s/g,'');
    const valid=market.countryCode==='GH'?/^\+233\d{9}$/.test(contact):/^\+63\d{10}$/.test(contact);
    if (!valid) { setError(`Use a valid ${market.country} number beginning with ${market.phonePrefix}.`); return; }
    setSubmitting(true);
    try {
      let checkoutForm = form;
      if ((!form.latitude || form.location_source !== 'address') && form.city && form.barangay) {
        try {
          const locationResponse = await fetch('/api/geocode', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({city:form.city,barangay:form.barangay,market_code:marketCode}) });
          const locationResult = await locationResponse.json();
          if (locationResponse.ok && locationResult.location) checkoutForm = { ...form, latitude:locationResult.location.latitude, longitude:locationResult.location.longitude, location_accuracy:null, location_source:'address' };
        } catch {}
      }
      const { city_code, ...address } = checkoutForm;
      const payload = { restaurant_id: items[0].restaurant_id, items: items.map(({ cart_id, ...item }) => item), subtotal, ...address, market_code:marketCode, country_code:market.countryCode, contact_number:contact };
      const response = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.order_number) throw new Error(result.error || 'The kitchen could not place your order.');
      saveOrder({ ...payload, ...result, items, status: 'Pending payment' });
      clearCart(); router.push(`/receipt/${encodeURIComponent(result.order_number)}`);
    } catch (err) { setError(err.message); setSubmitting(false); }
  };

  if (!ready) return <main className="center-page"><Loader2 className="spin" /></main>;
  if (!items.length) return <main className="center-page"><div className="empty-cart"><span><ShoppingBag /></span><p className="kicker">Your cart</p><h1>Still deciding?</h1><p>Your next favorite meal is waiting.</p><Link href="/" className="primary-button">Browse kitchens</Link></div></main>;

  const menuUrl = items[0].restaurant_slug || (items[0].restaurant_name ? restaurantSlug(items[0].restaurant_name) : items[0].restaurant_id);
  return <main className="checkout-page"><header className="checkout-header"><Link href={`/restaurant/${menuUrl}`} className="back-link"><ArrowLeft size={19} /> Back to menu</Link><p className="kicker">Almost yours</p><h1>Review & checkout</h1><p>One last look before we send it to the kitchen.</p></header><div className="checkout-layout">
    <section className="cart-review"><div className="block-heading"><h2>Your order</h2><span>{items.length} {items.length === 1 ? 'item' : 'items'}</span></div><div className="cart-items">{items.map((item) => <article className="cart-item" key={item.cart_id}><span className="quantity-badge">{item.quantity}×</span><div><h3>{item.name}</h3>{item.selected_options?.length > 0 && <p>{item.selected_options.map((option) => option.option_name).join(' · ')}</p>}{item.remarks && <em>“{item.remarks}”</em>}</div><div className="cart-item-end"><strong>{money(item.total_price)}</strong><button onClick={() => removeItem(item.cart_id)} aria-label={`Remove ${item.name}`}><Trash2 size={18} /></button></div></article>)}</div><div className="subtotal-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div></section>
    <form className="checkout-form" onSubmit={submit}><div className="block-heading"><div><p className="kicker">Guest details</p><h2>Check your details</h2><p className="prefill-note">We filled these in from your {market.label} profile. Please check or change anything before ordering.</p></div><MapPin /></div><div className="form-grid"><label className="full"><span>Name</span><input name="customer_name" value={form.customer_name} onChange={update} placeholder="Customer name" required /></label><label className="full"><span>Email</span><input type="email" name="customer_email" value={form.customer_email} onChange={update} placeholder="you@example.com" required /></label><label className="full"><span>Contact number</span><input name="contact_number" value={form.contact_number} onChange={update} inputMode="tel" placeholder={market.phonePrefix} required /></label><label><span>{market.cityLabel}</span><select name="city_code" value={form.city_code} onChange={chooseCity} disabled={!cities.length} required><option value="">{locationsLoading&&!cities.length?'Loading locations…':'Select location'}</option>{cities.map(city=><option value={city.code} key={city.code}>{city.name}</option>)}</select></label><label><span>{market.areaLabel}</span><select name="barangay" value={form.barangay} onChange={update} disabled={!form.city_code||locationsLoading} required><option value="">{locationsLoading&&form.city_code?'Loading areas…':'Select area'}</option>{barangays.map(barangay=><option value={barangay.name} key={barangay.code}>{barangay.name}</option>)}</select></label><label className="full"><span>House number / Street</span><input name="house_number" value={form.house_number} onChange={update} placeholder="House number and street" required /></label><label className="full"><span>Landmark / address hint <small>Optional</small></span><input name="landmark" value={form.landmark} onChange={update} placeholder="Nearby landmark, gate color, or building" /></label>{market.digitalAddress&&<label className="full"><span>GhanaPost GPS digital address <small>Optional</small></span><input name="digital_address" value={form.digital_address} onChange={update} placeholder="Example: GA-123-4567" /></label>}<label className="full"><span>Order remarks <small>Optional</small></span><textarea name="order_remarks" value={form.order_remarks} onChange={update} placeholder="Anything the kitchen should know?" /></label></div>{locationError && <p className="form-error" role="alert">{locationError} Please refresh to try again.</p>}{error && <p className="form-error" role="alert">{error}</p>}<button className="place-order-button" disabled={submitting || Boolean(locationError)}>{submitting ? <><Loader2 className="spin" /> Sending to kitchen…</> : <><span><CheckCircle2 /> Place order</span><strong>{money(subtotal)}</strong></>}</button><p className="checkout-note">You&apos;ll pay at the cashier after placing your order.</p></form>
  </div></main>;
}
