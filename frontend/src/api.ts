import type { ChatInfo } from './types'

// An Error that also remembers the HTTP status (401, 404, 503 ...)
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---------- admin token (saved in the browser) ----------
const TOKEN_KEY = 'admin_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ---------- one function that does every request ----------
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`/api${path}`, { ...options, headers })

  // Some responses may have no JSON body, so don't crash on that
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // FastAPI sends errors as {"detail": "..."}
    const detail = data?.detail
    const message = typeof detail === 'string' ? detail : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }

  return data as T
}

// ---------- chat ----------
export function getChatInfo() {
  return request<ChatInfo>('/chat/info')
}
