import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import type { CredentialResponse } from '@react-oauth/google'
import {
  clearSession,
  deleteSavedRoom,
  fetchSavedRooms,
  getGoogleProfile,
  getSessionToken,
  isGoogleConfigured,
  saveRoomVisit,
  signInWithGoogleCredential,
  type SavedRoom,
} from '../lib/accountApi'
import './Lobby.css'

type Props = {
  onJoin: (roomId: string, displayName: string) => void
}

function formatSavedTitle(r: SavedRoom) {
  if (r.roomLabel) return r.roomLabel
  if (r.roomId.length <= 14) return r.roomId
  return `${r.roomId.slice(0, 8)}…${r.roomId.slice(-4)}`
}

export function Lobby({ onJoin }: Props) {
  const [roomId, setRoomId] = useState('')
  const [roomNickname, setRoomNickname] = useState('')
  const [name, setName] = useState(
    () => sessionStorage.getItem('watchparty-name') || '',
  )
  const [sessionActive, setSessionActive] = useState(() => !!getSessionToken())
  const [profile, setProfile] = useState(() => getGoogleProfile())
  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([])
  const [accountMessage, setAccountMessage] = useState<string | null>(null)

  const googleEnabled = isGoogleConfigured()

  const refreshSaved = useCallback(async () => {
    if (!getSessionToken()) {
      setSavedRooms([])
      return
    }
    setAccountMessage(null)
    const list = await fetchSavedRooms()
    setSavedRooms(list)
  }, [])

  useEffect(() => {
    if (sessionActive) {
      void refreshSaved()
    }
  }, [sessionActive, refreshSaved])

  const enterRoom = useCallback(
    async (room: string, dn: string) => {
      sessionStorage.setItem('watchparty-name', dn)
      if (getSessionToken()) {
        await saveRoomVisit(
          room,
          roomNickname.trim() || undefined,
        )
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

  const onGoogleSuccess = async (c: CredentialResponse) => {
    if (!c.credential) return
    try {
      setAccountMessage(null)
      await signInWithGoogleCredential(c.credential)
      setSessionActive(true)
      setProfile(getGoogleProfile())
      await refreshSaved()
    } catch (e) {
      setAccountMessage(
        e instanceof Error ? e.message : 'Google sign-in failed',
      )
    }
  }

  const logout = () => {
    googleLogout()
    clearSession()
    setSessionActive(false)
    setProfile(null)
    setSavedRooms([])
    setAccountMessage(null)
  }

  const forgetRoom = async (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    await deleteSavedRoom(id)
    await refreshSaved()
  }

  return (
    <div className="lobby">
      <header className="lobby__header">
        <p className="eyebrow">Watch party</p>
        <h1>Join a room</h1>
        <p className="lede">
          Use the same room id as your friends to share your screen, sync a
          video, and chat. Sign in with Google to save rooms and reconnect with
          one click.
        </p>
      </header>

      {googleEnabled && (
        <div className="lobby__account">
          {sessionActive && profile ? (
            <div className="lobby__signed-in">
              <p>
                Signed in as <strong>{profile.email}</strong>
              </p>
              <button type="button" className="btn secondary" onClick={logout}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="lobby__google">
              <p className="lobby__google-label">Save &amp; restore your rooms</p>
              <GoogleLogin
                onSuccess={(c) => void onGoogleSuccess(c)}
                onError={() =>
                  setAccountMessage('Google popup failed or was dismissed.')
                }
                useOneTap={false}
              />
            </div>
          )}
          {accountMessage && (
            <p className="lobby__account-msg" role="alert">
              {accountMessage}
            </p>
          )}
        </div>
      )}

      {!googleEnabled && (
        <p className="lobby__hint muted">
          Google sign-in is optional. To enable saved rooms, add{' '}
          <code>VITE_GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_ID</code>{' '}
          (see README).
        </p>
      )}

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

      <div className="lobby__card">
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
            <button type="button" className="btn secondary" onClick={() => setRoomId(crypto.randomUUID())}>
              New id
            </button>
          </div>
        </label>

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
