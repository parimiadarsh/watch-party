import { useState } from 'react'
import type {
  PlaybackControlMode,
  PlaybackControlState,
  PlaybackMessage,
  Peer,
} from '../../hooks/usePartyRoom'
import { SyncedVideoPanel } from '../SyncedVideoPanel'
import { StreamingSyncPanel } from './StreamingSyncPanel'
import './PlaybackWatchSection.css'

export type WatchMode = 'file' | 'streaming'

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

export function PlaybackWatchSection(props: Props) {
  const [mode, setMode] = useState<WatchMode>('streaming')

  return (
    <div className="watch-section">
      <div className="watch-section__tabs" role="tablist" aria-label="Watch mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'streaming'}
          className={
            mode === 'streaming'
              ? 'watch-section__tab watch-section__tab--on'
              : 'watch-section__tab'
          }
          onClick={() => setMode('streaming')}
        >
          Netflix, Prime, Disney+…
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'file'}
          className={
            mode === 'file'
              ? 'watch-section__tab watch-section__tab--on'
              : 'watch-section__tab'
          }
          onClick={() => setMode('file')}
        >
          Direct video file
        </button>
      </div>

      {mode === 'streaming' ? (
        <StreamingSyncPanel {...props} />
      ) : (
        <SyncedVideoPanel {...props} />
      )}
    </div>
  )
}
