import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PlaybackControlMode,
  PlaybackControlState,
  PlaybackMessage,
  Peer,
} from '../hooks/usePartyRoom'
import { PlaybackControlPicker } from './playback/PlaybackControlPicker'
import { peerLabel } from './playback/playbackLabels'
import './SyncedVideoPanel.css'

const SAMPLE_MP4 =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

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

export function SyncedVideoPanel({
  clientId,
  displayName,
  peers,
  playbackControl,
  sendPlaybackIntent,
  setPlaybackMode,
  setController,
  subscribePlayback,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [urlInput, setUrlInput] = useState(SAMPLE_MP4)
  const [activeUrl, setActiveUrl] = useState(SAMPLE_MP4)
  const applyingRef = useRef(false)
  const controlRef = useRef(playbackControl)
  controlRef.current = playbackControl

  const { controlMode, controllerId } = playbackControl
  const activeControllerId = controllerId ?? clientId
  const isController =
    controlMode === 'dual' || controllerId === clientId || controllerId == null
  const canSeekOrLoad = controlMode === 'dual' || isController

  const loadUrl = useCallback(
    (nextUrl: string, syncOthers: boolean) => {
      const v = videoRef.current
      const u = nextUrl.trim() || SAMPLE_MP4
      setActiveUrl(u)
      if (v) {
        v.src = u
      }
      if (syncOthers && canSeekOrLoad) {
        sendPlaybackIntent('url', 0, u)
      }
    },
    [sendPlaybackIntent, canSeekOrLoad],
  )

  useEffect(() => {
    return subscribePlayback((msg) => {
      const ctrl = controlRef.current
      const skipOwn =
        ctrl.controlMode === 'single' && msg.fromId === clientId
      if (skipOwn) return

      const v = videoRef.current
      if (!v) return
      applyingRef.current = true
      const run = async () => {
        try {
          const target = msg.videoUrl
          if (target && v.src !== target) {
            setActiveUrl(target)
            v.src = target
          }
          if (msg.action === 'url' && msg.videoUrl) {
            setActiveUrl(msg.videoUrl)
            v.src = msg.videoUrl
          }
          try {
            v.load()
          } catch {
            /* ignore */
          }
          if (
            msg.currentTime != null &&
            (msg.action === 'seek' || msg.action === 'url')
          ) {
            v.currentTime = msg.currentTime
          }
          if (msg.action === 'play') {
            await v.play()
          }
          if (msg.action === 'pause') {
            v.pause()
          }
        } catch {
          /* autoplay policy etc. */
        } finally {
          applyingRef.current = false
        }
      }
      void run()
    })
  }, [subscribePlayback, clientId])

  const sendIntent = (action: string) => {
    const v = videoRef.current
    if (!v || applyingRef.current) return
    sendPlaybackIntent(action, v.currentTime, v.currentSrc || activeUrl)
  }

  const onPlay = () => {
    if (applyingRef.current) return
    const v = videoRef.current
    if (!v) return
    const ctrl = controlRef.current

    if (ctrl.controlMode === 'single') {
      if (ctrl.controllerId != null && ctrl.controllerId !== clientId) {
        v.pause()
        return
      }
      sendIntent('play')
      return
    }

    v.pause()
    sendIntent('play')
  }

  const onPause = () => {
    if (applyingRef.current) return
    const v = videoRef.current
    if (!v) return
    const ctrl = controlRef.current

    if (ctrl.controlMode === 'single') {
      if (ctrl.controllerId != null && ctrl.controllerId !== clientId) {
        return
      }
      sendIntent('pause')
      return
    }

    sendIntent('pause')
  }

  const onSeeked = () => {
    if (applyingRef.current) return
    if (!canSeekOrLoad) return
    sendIntent('seek')
  }

  return (
    <section className="syncvid">
      <header className="syncvid__header">
        <h2>Direct video</h2>
      </header>

      <PlaybackControlPicker
        clientId={clientId}
        displayName={displayName}
        peers={peers}
        playbackControl={playbackControl}
        setPlaybackMode={setPlaybackMode}
        setController={setController}
        everyoneOptionSuffix="play when all press play; anyone can pause; seek and load for all"
        personOptionSuffix="only they can play, pause, and load"
        singleModeHint={`${peerLabel(activeControllerId, clientId, displayName, peers)} has control — only they can play, pause, or load.`}
      />

      <p className="syncvid__hint">
        Paste a direct file URL (MP4, WebM). Streaming sites cannot play here.
      </p>

      <div className="syncvid__row">
        <input
          className="syncvid__url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          spellCheck={false}
          aria-label="Video file URL"
          disabled={!canSeekOrLoad}
        />
        <button
          type="button"
          className="btn secondary"
          onClick={() => loadUrl(urlInput, true)}
          disabled={!canSeekOrLoad}
        >
          Load for everyone
        </button>
      </div>

      <video
        ref={videoRef}
        className={`syncvid__video${!isController && controlMode === 'single' ? ' syncvid__video--locked' : ''}`}
        controls
        controlsList={
          controlMode === 'single' && !isController
            ? 'nodownload nofullscreen noremoteplayback'
            : undefined
        }
        src={activeUrl}
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
      />
    </section>
  )
}
