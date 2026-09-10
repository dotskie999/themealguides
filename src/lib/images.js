export function normalizeImageUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (url.hostname === 'drive.google.com' || url.hostname === 'www.drive.google.com') {
      const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const id = pathMatch?.[1] || url.searchParams.get('id');
      if (id) return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1200`;
    }
    return url.protocol === 'http:' || url.protocol === 'https:' ? raw : '';
  } catch {
    return '';
  }
}
