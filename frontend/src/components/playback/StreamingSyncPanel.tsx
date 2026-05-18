import { useEffect, useRef, useState } from 'react'
import type {
  PlaybackControlMode,
  PlaybackControlState,
  PlaybackMessage,
  Peer,
} from '../../hooks/usePartyRoom'
import { formatPlaybackTime, parseTimeInput } from '../../lib/playbackTime'
import { peerLabel } from './playbackLabels'
import { PlaybackControlPicker } from './PlaybackControlPicker'
import './StreamingSyncPanel.css'

const PLATFORMS = [
  'Netflix',
  'Prime Video',
  'Disney+',
  'Hulu',
  'Max',
  'YouTube',
  'Other',
] as const

type Cue = {
  action: 'play' | 'pause' | 'seek'
  fromId: string
  fromName: string
  currentTime?: number
  at: number
}

type Props = {
  clientId: string
  displayName: string
  peers: Peer[]
  playbackControl: PlaybackControlState
  sendPlaybackIntent: (
    action: string,
    currentTime?: number,
    videoUrl?: string,
  ) => void
  setPlaybackMode: (mode: PlaybackControlMode) => void
  setController: (controllerId: string) => void
  subscribePlayback: (fn: (msg: PlaybackMessage) => void) => () => void
}

export function StreamingSyncPanel({
  clientId,
  displayName,
  peers,
  playbackControl,
  sendPlaybackIntent,
  setPlaybackMode,
  setController,
  subscribePlayback,
}: Props) {
  const [platform, setPlatform] = useState<string>(PLATFORMS[0])
  const [positionSec, setPositionSec] = useState(0)
  const [seekInput, setSeekInput] = useState('0:00')
  const [localStatus, setLocalStatus] = useState<'playing' | 'paused'>('paused')
  const [cue, setCue] = useState<Cue | null>(null)
  const controlRef = useRef(playbackControl)
  controlRef.current = playbackControl

  const { controlMode, controllerId } = playbackControl
  const activeControllerId = controllerId ?? clientId
  const isController =
    controlMode === 'dual' || activeControllerId === clientId
  const canTransport = isController

  const nameFor = (id: string) => peerLabel(id, clientId, displayName, peers)

  useEffect(() => {
    return subscribePlayback((msg) => {
      const ctrl = controlRef.current
      const skipOwn =
        ctrl.controlMode === 'single' && msg.fromId === clientId
      if (skipOwn) return

      const action = msg.action as Cue['action']
      if (action !== 'play' && action !== 'pause' && action !== 'seek') return

      setCue({
        action,
        fromId: msg.fromId,
        fromName: nameFor(msg.fromId),
        currentTime: msg.currentTime,
        at: msg.emittedAt,
      })
      if (action === 'play') setLocalStatus('playing')
      if (action === 'pause') setLocalStatus('paused')
      if (action === 'seek' && msg.currentTime != null) {
        setPositionSec(msg.currentTime)
        setSeekInput(formatPlaybackTime(msg.currentTime))
      }
    })
  }, [subscribePlayback, clientId, displayName, peers])

  const sendAtPosition = (action: string, time = positionSec) => {
    sendPlaybackIntent(action, time)
  }

  const onPlay = () => {
    if (!canTransport) return
    sendAtPosition('play')
    if (controlMode === 'single') setLocalStatus('playing')
  }

  const onPause = () => {
    if (controlMode === 'dual' || isController) {
      sendAtPosition('pause')
      setLocalStatus('paused')
    }
  }

  const onSeek = () => {
    if (!canTransport) return
    const t = parseTimeInput(seekInput)
    if (t == null) return
    setPositionSec(t)
    sendAtPosition('seek', t)
  }

  const cueText = () => {
    if (!cue) return null
    const t =
      cue.currentTime != null ? formatPlaybackTime(cue.currentTime) : null
    switch (cue.action) {
      case 'play':
        return t
          ? `Press PLAY on ${platform} at ${t}`
          : `Press PLAY on ${platform} now`
      case 'pause':
        return `Press PAUSE on ${platform}`
      case 'seek':
        return t ? `Seek to ${t} on ${platform}` : `Seek on ${platform}`
      default:
        return null
    }
  }

  const controllerName = nameFor(activeControllerId)

  return (
    <section className="stream-sync">
      <header className="stream-sync__header">
        <h2>Streaming sync</h2>
        <p className="stream-sync__lede">
          Everyone opens the <strong>same show or movie</strong> on their own
          account ({platform}, etc.). Controls here tell the room when to play,
          pause, or seek — you perform the action on your streaming app.
        </p>
      </header>

      <label className="stream-sync__platform">
        <span>I am watching on</span>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          aria-label="Streaming platform"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <PlaybackControlPicker
        clientId={clientId}
        displayName={displayName}
        peers={peers}
        playbackControl={playbackControl}
        setPlaybackMode={setPlaybackMode}
        setController={setController}
        everyoneOptionSuffix="all press play on their app, then everyone plays; anyone can pause; anyone can seek"
        personOptionSuffix="only they send play, pause, and seek cues"
        singleModeHint={`${controllerName} has control — match their play, pause, and seek on your ${platform} tab.`}
      />

      <div
        className={`stream-sync__status stream-sync__status--${localStatus}`}
        role="status"
      >
        Room status: {localStatus === 'playing' ? 'Playing' : 'Paused'}
        {' · '}
        Reference time {formatPlaybackTime(positionSec)}
      </div>

      {cue && (
        <div
          className={`stream-sync__cue stream-sync__cue--${cue.action}`}
          role="alert"
          key={cue.at}
        >
          <p className="stream-sync__cue-who">{cue.fromName} says</p>
          <p className="stream-sync__cue-action">{cueText()}</p>
        </div>
      )}

      <div className="stream-sync__transport">
        <button
          type="button"
          className="btn primary stream-sync__btn"
          onClick={onPlay}
          disabled={!canTransport}
          title={
            controlMode === 'dual' && peers.length > 0
              ? 'Everyone must press play before the room starts'
              : undefined
          }
        >
          Play
        </button>
        <button
          type="button"
          className="btn secondary stream-sync__btn"
          onClick={onPause}
          disabled={controlMode === 'single' && !isController}
        >
          Pause
        </button>
        <label className="stream-sync__seek">
          <span>Seek to</span>
          <input
            type="text"
            value={seekInput}
            onChange={(e) => setSeekInput(e.target.value)}
            placeholder="m:ss or seconds"
            disabled={!canTransport}
            aria-label="Seek position"
          />
          <button
            type="button"
            className="btn secondary"
            onClick={onSeek}
            disabled={!canTransport}
          >
            Sync seek
          </button>
        </label>
      </div>

      <ol className="stream-sync__steps">
        <li>Pick the same title in your {platform} app or browser.</li>
        <li>Use the controls above (not only the streaming player).</li>
        <li>
          When you see a cue, do that action on {platform} — this app cannot
          press buttons on Netflix or Prime for you.
        </li>
      </ol>
    </section>
  )
}
