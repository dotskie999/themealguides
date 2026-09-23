export function normalizeAdminUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function validAdminUsername(value) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizeAdminUsername(value));
}

export function adminUsernameEmail(value) {
  const username=normalizeAdminUsername(value);
  return `${username}@staff.themealguides.local`;
}
