// Must match BASE_DOMAIN and ADMIN_SUBDOMAIN in backend/.env
export const BASE_DOMAIN: string = import.meta.env.VITE_BASE_DOMAIN ?? 'localhost'
export const ADMIN_SUBDOMAIN: string = import.meta.env.VITE_ADMIN_SUBDOMAIN ?? 'admin'

// Same logic as backend/app/core/tenant.py
//   "acme.localhost" -> "acme",  "localhost" -> null
export function getSubdomain(): string | null {
  const host = window.location.hostname.toLowerCase()
  const suffix = '.' + BASE_DOMAIN
  if (!host.endsWith(suffix)) return null
  return host.slice(0, -suffix.length) || null
}
