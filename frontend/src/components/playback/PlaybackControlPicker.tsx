import type {
  PlaybackControlMode,
  PlaybackControlState,
  Peer,
} from '../../hooks/usePartyRoom'
import './PlaybackControlPicker.css'

type Props = {
  clientId: string
  displayName: string
  peers: Peer[]
  playbackControl: PlaybackControlState
  setPlaybackMode: (mode: PlaybackControlMode) => void
  setController: (controllerId: string) => void
  /** Shown under single-controller warning */
  singleModeHint?: string
  everyoneOptionSuffix?: string
  personOptionSuffix?: string
}

export function PlaybackControlPicker({
  clientId,
  displayName,
  peers,
  playbackControl,
  setPlaybackMode,
  setController,
  singleModeHint,
  everyoneOptionSuffix = 'play when all press play; anyone can pause',
  personOptionSuffix = 'only they can play, pause, and seek',
}: Props) {
  const { controlMode, controllerId, playReady, peerCount } = playbackControl
  const activeControllerId = controllerId ?? clientId
  const everyoneIds = [clientId, ...peers.map((p) => p.clientId)]

  const selectController = (id: string) => {
    if (controlMode !== 'single' || activeControllerId !== id) {
      setPlaybackMode('single')
    }
    setController(id)
  }

  const waitingForPlay =
    controlMode === 'dual' &&
    peerCount > 1 &&
    playReady.length > 0 &&
    playReady.length < peerCount

  const labelFor = (id: string) => {
    if (id === clientId) return `${displayName} (you)`
    return peers.find((p) => p.clientId === id)?.displayName ?? id.slice(0, 8)
  }

  return (
    <>
      <fieldset className="pb-ctrl__fieldset">
        <legend>Who controls playback?</legend>
        <label className="pb-ctrl__radio">
          <input
            type="radio"
            name="playbackControl"
            checked={controlMode === 'dual'}
            onChange={() => setPlaybackMode('dual')}
          />
          <span>
            <strong>Everyone</strong> — {everyoneOptionSuffix}
          </span>
        </label>
        <label className="pb-ctrl__radio">
          <input
            type="radio"
            name="playbackControl"
            checked={
              controlMode === 'single' && activeControllerId === clientId
            }
            onChange={() => selectController(clientId)}
          />
          <span>
            <strong>{displayName}</strong> (you) — {personOptionSuffix}
          </span>
        </label>
        {peers.map((p) => (
          <label key={p.clientId} className="pb-ctrl__radio">
            <input
              type="radio"
              name="playbackControl"
              checked={
                controlMode === 'single' && activeControllerId === p.clientId
              }
              onChange={() => selectController(p.clientId)}
            />
            <span>
              <strong>{p.displayName}</strong> — {personOptionSuffix}
            </span>
          </label>
        ))}
      </fieldset>

      {controlMode === 'dual' && peerCount > 1 && (
        <p className="pb-ctrl__ready" role="status">
          {waitingForPlay ? (
            <>
              Waiting for everyone to press play ({playReady.length}/{peerCount}{' '}
              ready)
            </>
          ) : playReady.includes(clientId) ? (
            <>You pressed play — waiting for others</>
          ) : (
            <>Press play when ready on your streaming app</>
          )}
        </p>
      )}

      {controlMode === 'dual' && peerCount > 1 && playReady.length > 0 && (
        <ul className="pb-ctrl__ready-list">
          {everyoneIds.map((id) => (
            <li
              key={id}
              className={
                playReady.includes(id)
                  ? 'pb-ctrl__ready-item pb-ctrl__ready-item--on'
                  : 'pb-ctrl__ready-item'
              }
            >
              {labelFor(id)}
              {playReady.includes(id) ? ' ✓' : ''}
            </li>
          ))}
        </ul>
      )}

      {controlMode === 'single' &&
        activeControllerId !== clientId &&
        singleModeHint && (
          <p className="pb-ctrl__warn">{singleModeHint}</p>
        )}
    </>
  )
}
