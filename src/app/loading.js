import Image from 'next/image';

export default function Loading() {
  return <main className="app-loading"><div className="loading-logo"><Image src="/the-meal-guides-logo.png" alt="" width={180} height={120} priority /></div><h1>the meal guides</h1><p>Bringing today&apos;s cravings to the table…</p><div className="loading-dots" aria-label="Loading"><i /><i /><i /></div><div className="skeleton-tray"><span /><span /><span /></div></main>;
}
