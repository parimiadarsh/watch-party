export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function parseTimeInput(raw: string): number | null {
  const t = raw.trim()
  if (!t) return null
  if (t.includes(':')) {
    const parts = t.split(':').map((p) => Number(p))
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return null
  }
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}
