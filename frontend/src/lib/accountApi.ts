const TOKEN_KEY = 'watchparty-session-jwt'
const PROFILE_KEY = 'watchparty-google-profile'

export type GoogleProfile = { email: string; name: string }

export type SavedRoom = {
  roomId: string
  roomLabel: string | null
  lastUsedAt: string
}

export function getSessionToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getGoogleProfile(): GoogleProfile | null {
  const raw = sessionStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GoogleProfile
  } catch {
    return null
  }
}

export function setSession(token: string, profile?: GoogleProfile) {
  sessionStorage.setItem(TOKEN_KEY, token)
  if (profile) {
    sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  }
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(PROFILE_KEY)
}

export async function signInWithGoogleCredential(credential: string) {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: credential }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || res.statusText)
  }
  const data = (await res.json()) as {
    token: string
    email: string
    name: string
  }
  setSession(data.token, { email: data.email, name: data.name })
}

export async function fetchSavedRooms(): Promise<SavedRoom[]> {
  const token = getSessionToken()
  if (!token) return []
  const res = await fetch('/api/me/rooms', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    clearSession()
    return []
  }
  if (!res.ok) return []
  return (await res.json()) as SavedRoom[]
}

export async function saveRoomVisit(roomId: string, roomLabel?: string) {
  const token = getSessionToken()
  if (!token) return
  await fetch('/api/me/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      roomId,
      roomLabel: roomLabel && roomLabel.trim() ? roomLabel.trim() : undefined,
    }),
  })
}

export async function deleteSavedRoom(roomId: string) {
  const token = getSessionToken()
  if (!token) return
  await fetch(`/api/me/rooms/${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function isGoogleConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim())
}
