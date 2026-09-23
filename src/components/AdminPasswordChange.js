'use client';
import { useState } from 'react';
import Image from 'next/image';
import { KeyRound, Loader2, LogOut, ShieldCheck, X } from 'lucide-react';

export default function AdminPasswordChange({session,forced=false,onClose}) {
  const [form,setForm]=useState({current_password:'',new_password:'',confirm_password:''});
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const update=(event)=>setForm(current=>({...current,[event.target.name]:event.target.value}));
  const logout=async()=>{await fetch('/api/admin/auth',{method:'DELETE'});window.location.reload();};
  async function submit(event) {
    event.preventDefault(); setError('');
    if(form.new_password!==form.confirm_password){setError('The new passwords do not match.');return;}
    setSaving(true);
    try {
      const response=await fetch('/api/admin/auth',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||'Unable to change password.');
      window.location.reload();
    } catch(changeError){setError(changeError.message);setSaving(false);}
  }
  const formContent=<form className="password-change-form" onSubmit={submit}>
    <label><span>Current password</span><input type="password" name="current_password" autoComplete="current-password" value={form.current_password} onChange={update} required autoFocus placeholder={forced?'Enter your temporary password':'Enter current password'}/></label>
    <label><span>New password</span><input type="password" name="new_password" autoComplete="new-password" minLength={8} value={form.new_password} onChange={update} required placeholder="At least 8 characters"/></label>
    <label><span>Confirm new password</span><input type="password" name="confirm_password" autoComplete="new-password" minLength={8} value={form.confirm_password} onChange={update} required placeholder="Repeat new password"/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="primary-button" disabled={saving}>{saving?<Loader2 className="spin"/>:<ShieldCheck/>}{saving?'Updating password…':'Save new password'}</button>
  </form>;
  if(forced) return <main className="admin-login-page"><section className="admin-login-card password-change-card"><div className="admin-login-logo"><Image src="/the-meal-guides-logo.png" alt="The Meal Guides" width={140} height={96}/></div><span className="security-mark"><KeyRound/></span><p className="kicker">Welcome, {session.displayName}</p><h1>Create your password</h1><p className="admin-login-copy">Your temporary password worked. Replace it now before entering the dashboard.</p>{formContent}<button type="button" className="emergency-login-toggle" onClick={logout}><LogOut size={16}/> Sign out instead</button></section></main>;
  return <div className="admin-modal-bg" onMouseDown={event=>event.target===event.currentTarget&&onClose?.()}><section className="admin-modal password-change-modal" role="dialog" aria-modal="true" aria-labelledby="password-change-title"><header><div><p className="kicker">Account security</p><h2 id="password-change-title">Change password</h2></div><button onClick={onClose} disabled={saving} aria-label="Close"><X/></button></header><div className="password-change-body"><p>Update the password for <strong>@{session.username}</strong>.</p>{formContent}</div></section></div>;
}
