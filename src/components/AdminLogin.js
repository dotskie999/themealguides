'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ pin }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to sign in.');
      router.refresh();
    } catch (e) { setError(e.message); setLoading(false); }
  }
  return <main className="admin-login-page"><section className="admin-login-card">
    <div className="admin-login-logo"><Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={140} height={96}/></div>
    <span className="security-mark"><ShieldCheck/></span><p className="kicker">Kitchen control center</p><h1>Admin access</h1><p className="admin-login-copy">Enter the PIN stored in your AdminAuth sheet.</p>
    <form onSubmit={submit}><label htmlFor="admin-pin">Admin PIN</label><div className="pin-input"><LockKeyhole/><input id="admin-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e=>setPin(e.target.value)} autoFocus required placeholder="Enter PIN"/></div>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading?<Loader2 className="spin"/>:<ShieldCheck/>}{loading?'Checking…':'Unlock dashboard'}</button></form>
  </section></main>;
}
