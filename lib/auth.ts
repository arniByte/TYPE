// Quick (guest) accounts: username + password only, no real email. We map the
// chosen @handle to a stable synthetic email so Supabase Auth can store it.
// These accounts are recovered with the same @handle + password.
const QUICK_DOMAIN = 'guest.type.app';

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${QUICK_DOMAIN}`;
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{2,24}$/.test(username.trim().toLowerCase());
}

export function cleanUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
}
