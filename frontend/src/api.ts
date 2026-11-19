import type { ChatInfo, CreateSystemInput, RagSystem } from './types'


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
      // Token expired/invalid -> forget it and go to the login page
      if (response.status === 401 && token && path !== '/admin/login') {
        clearToken()
        window.location.assign('/login')
      }

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

// Turn any error into a message we can show the user
export function getErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Could not connect to the server.'
}

// ---------- admin ----------
export async function login(password: string) {
  const data = await request<{ token: string }>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setToken(data.token)
}

export function listSystems() {
  return request<RagSystem[]>('/admin/systems')
}

export function createSystem(input: CreateSystemInput) {
  return request<RagSystem>('/admin/systems', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function startSystem(id: string) {
  return request<RagSystem>(`/admin/systems/${id}/start`, { method: 'POST' })
}

export function stopSystem(id: string) {
  return request<RagSystem>(`/admin/systems/${id}/stop`, { method: 'POST' })
}

export function archiveSystem(id: string) {
  return request<{ archived: string }>(`/admin/systems/${id}`, { method: 'DELETE' })
}
