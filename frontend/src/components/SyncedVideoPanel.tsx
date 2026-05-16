import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaybackMessage } from '../hooks/usePartyRoom'
import './SyncedVideoPanel.css'

const SAMPLE_MP4 =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

type Props = {
  clientId: string
  sendPlayback: (action: string, currentTime?: number, videoUrl?: string) => void
  subscribePlayback: (
    fn: (msg: PlaybackMessage) => void,
  ) => () => void
}

export function SyncedVideoPanel({
  clientId,
  sendPlayback,
  subscribePlayback,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [urlInput, setUrlInput] = useState(SAMPLE_MP4)
  const [activeUrl, setActiveUrl] = useState(SAMPLE_MP4)
  const applyingRef = useRef(false)

  const loadUrl = useCallback(
    (nextUrl: string, syncOthers: boolean) => {
      const v = videoRef.current
      const u = nextUrl.trim() || SAMPLE_MP4
      setActiveUrl(u)
      if (v) {
        v.src = u
      }
      if (syncOthers) {
        sendPlayback('url', 0, u)
      }
    },
    [sendPlayback],
  )

  useEffect(() => {
    return subscribePlayback((msg) => {
      if (msg.fromId === clientId) return
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
          if (msg.currentTime != null && (msg.action === 'seek' || msg.action === 'url')) {
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

  const notify = (action: string) => {
    const v = videoRef.current
    if (!v || applyingRef.current) return
    sendPlayback(action, v.currentTime, v.currentSrc || activeUrl)
  }

  return (
    <section className="syncvid">
      <header className="syncvid__header">
        <h2>Synced playback</h2>
      </header>
      <p className="syncvid__hint">
        Same room id = shared play/pause/seek. Use a direct video file URL (MP4,
        etc.). Many streaming sites block embedding; screen share is better for
        those.
      </p>
      <div className="syncvid__row">
        <input
          className="syncvid__url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          spellCheck={false}
          aria-label="Video file URL"
        />
        <button
          type="button"
          className="btn secondary"
          onClick={() => loadUrl(urlInput, true)}
        >
          Load for everyone
        </button>
      </div>
      <video
        ref={videoRef}
        className="syncvid__video"
        controls
        src={activeUrl}
        onPlay={() => notify('play')}
        onPause={() => notify('pause')}
        onSeeked={() => notify('seek')}
      />
    </section>
  )
}
