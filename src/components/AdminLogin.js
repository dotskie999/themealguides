'use client';
import { useState } from 'react';
import Image from 'next/image';
import { KeyRound, Loader2, LockKeyhole, ShieldAlert, ShieldCheck, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [form,setForm]=useState({username:'',password:'',pin:''});
  const [emergency,setEmergency]=useState(false);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();
  const update=(event)=>setForm((current)=>({...current,[event.target.name]:event.target.value}));
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const body=emergency?{mode:'emergency',pin:form.pin}:{username:form.username,password:form.password};
      const response=await fetch('/api/admin/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Unable to sign in.');
      router.refresh();
    } catch(e){setError(e.message);setLoading(false);}
  }
  return <main className="admin-login-page"><section className="admin-login-card">
    <div className="admin-login-logo"><Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={140} height={96}/></div>
    <span className={`security-mark ${emergency?'emergency':''}`}>{emergency?<ShieldAlert/>:<ShieldCheck/>}</span><p className="kicker">Kitchen control center</p><h1>{emergency?'Emergency access':'Staff sign in'}</h1><p className="admin-login-copy">{emergency?'Use this only when staff account login is unavailable. All emergency actions are logged.':'Sign in using the account issued by your Super Admin.'}</p>
    <form onSubmit={submit}>{emergency?<><label htmlFor="admin-pin">Emergency PIN</label><div className="pin-input"><LockKeyhole/><input id="admin-pin" name="pin" type="password" inputMode="numeric" autoComplete="off" value={form.pin} onChange={update} autoFocus required placeholder="Enter emergency PIN"/></div></>:<><label htmlFor="admin-username">Username</label><div className="pin-input"><UserRound/><input id="admin-username" name="username" autoComplete="username" value={form.username} onChange={update} autoFocus required placeholder="Enter username"/></div><label htmlFor="admin-password">Password</label><div className="pin-input"><KeyRound/><input id="admin-password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={update} required placeholder="Enter password"/></div></>}{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={loading}>{loading?<Loader2 className="spin"/>:<ShieldCheck/>}{loading?'Checking…':emergency?'Start emergency session':'Sign in'}</button></form>
    <button type="button" className="emergency-login-toggle" onClick={()=>{setEmergency((value)=>!value);setError('');}}>{emergency?'Return to staff sign in':'Emergency PIN access'}</button>
  </section></main>;
}
