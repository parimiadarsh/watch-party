import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { googleLogout } from '@react-oauth/google'
import {
  clearSession,
  deleteSavedRoom,
  fetchSavedRooms,
  getGoogleProfile,
  getSessionToken,
  isGoogleConfigured,
  saveRoomVisit,
  type SavedRoom,
} from '../lib/accountApi'
import { GoogleSignInButton } from './GoogleSignInButton'
import './Lobby.css'

type Props = {
  onJoin: (roomId: string, displayName: string) => void
  onBack: () => void
}

function formatSavedTitle(r: SavedRoom) {
  if (r.roomLabel) return r.roomLabel
  if (r.roomId.length <= 14) return r.roomId
  return `${r.roomId.slice(0, 8)}…${r.roomId.slice(-4)}`
}

export function Lobby({ onJoin, onBack }: Props) {
  const [roomId, setRoomId] = useState('')
  const [roomNickname, setRoomNickname] = useState('')
  const [name, setName] = useState(
    () => sessionStorage.getItem('watchparty-name') || '',
  )
  const [sessionActive, setSessionActive] = useState(() => !!getSessionToken())
  const [profile, setProfile] = useState(() => getGoogleProfile())
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([])
  const googleEnabled = isGoogleConfigured()

  const refreshSaved = useCallback(async () => {
    if (!getSessionToken()) {
      setSavedRooms([])
      return
    }
    const list = await fetchSavedRooms()
    setSavedRooms(list)
  }, [])

  const onGoogleLogin = useCallback(() => {
    setSessionActive(true)
    setProfile(getGoogleProfile())
    void refreshSaved()
  }, [refreshSaved])

  useEffect(() => {
    if (sessionActive) {
      void refreshSaved()
    }
  }, [sessionActive, refreshSaved])

  useEffect(() => {
    if (profile?.name && !name.trim()) {
      setName(profile.name)
    }
  }, [profile?.name, name])

  const enterRoom = useCallback(
    async (room: string, dn: string) => {
      sessionStorage.setItem('watchparty-name', dn)
      if (getSessionToken()) {
        await saveRoomVisit(room, roomNickname.trim() || undefined)
        await refreshSaved()
      }
      onJoin(room, dn)
    },
    [onJoin, roomNickname, refreshSaved],
  )

  const join = () => {
    const room = roomId.trim()
    if (!room) return
    const dn = name.trim() || 'Guest'
    void enterRoom(room, dn)
  }

  const reconnect = (saved: SavedRoom) => {
    const room = saved.roomId.trim()
    if (!room) return
    setRoomId(saved.roomId)
    if (saved.roomLabel) {
      setRoomNickname(saved.roomLabel)
    }
    const dn = name.trim() || 'Guest'
    void enterRoom(room, dn)
  }

  const signOut = () => {
    if (googleEnabled) {
      googleLogout()
    }
    clearSession()
    setSessionActive(false)
    setProfile(null)
    setSavedRooms([])
    onBack()
  }

  const forgetRoom = async (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    await deleteSavedRoom(id)
    await refreshSaved()
  }

  return (
    <div className="lobby">
      <header className="lobby__top">
        <button type="button" className="btn ghost lobby__back" onClick={onBack}>
          ← Back
        </button>
        <div className="lobby__top-actions">
          {sessionActive ? (
            <button
              type="button"
              className="btn ghost lobby__signout"
              onClick={signOut}
            >
              Sign out
            </button>
          ) : (
            googleEnabled && (
              <GoogleSignInButton compact onSuccess={onGoogleLogin} />
            )
          )}
        </div>
      </header>

      <header className="lobby__header">
        <p className="eyebrow">K-Drama · C-Drama · Anime</p>
        <h1>Join the watch party</h1>
        <p className="lede">
          {sessionActive && profile
            ? `Signed in as ${profile.email}. Pick a room or reconnect to a saved binge.`
            : 'Share a room id with your crew — sync episodes, share your screen, and chat through every plot twist.'}
        </p>
      </header>

      {sessionActive && savedRooms.length > 0 && (
        <div className="lobby__saved">
          <h2 className="lobby__saved-title">Your saved rooms</h2>
          <ul className="lobby__saved-list">
            {savedRooms.map((r) => (
              <li key={r.roomId} className="lobby__saved-item">
                <button
                  type="button"
                  className="lobby__reconnect"
                  onClick={() => reconnect(r)}
                  title={r.roomId}
                >
                  <span className="lobby__reconnect-title">
                    {formatSavedTitle(r)}
                  </span>
                  <span className="lobby__reconnect-meta">
                    {new Date(r.lastUsedAt).toLocaleString()}
                  </span>
                </button>
                <button
                  type="button"
                  className="lobby__forget"
                  aria-label={`Remove ${formatSavedTitle(r)} from saved`}
                  onClick={(e) => void forgetRoom(r.roomId, e)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="lobby__card glass-card">
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            maxLength={48}
            autoComplete="nickname"
          />
        </label>

        <label className="field">
          <span>Room id (share this UUID)</span>
          <div className="field__row">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. paste a UUID"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn secondary"
              onClick={() => setRoomId(crypto.randomUUID())}
            >
              New id
            </button>
          </div>
        </label>

        {!sessionActive && googleEnabled && (
          <div className="lobby__google-cta">
            <p className="lobby__google-cta-text">
              Sign in with Google to save rooms and reconnect later.
            </p>
            <GoogleSignInButton onSuccess={onGoogleLogin} />
          </div>
        )}

        {sessionActive && (
          <label className="field">
            <span>Room nickname (optional, saved with your Google account)</span>
            <input
              value={roomNickname}
              onChange={(e) => setRoomNickname(e.target.value)}
              placeholder="Movie night"
              maxLength={128}
            />
          </label>
        )}

        <button type="button" className="btn primary" onClick={join}>
          Enter room
        </button>
      </div>
    </div>
  )
}

