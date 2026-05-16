import { useEffect, useRef } from 'react'
import type { Peer } from '../hooks/usePartyRoom'
import './ScreenShareStage.css'

type Props = {
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  sharing: boolean
  peers: Peer[]
  onStartShare: () => void
  onStopShare: () => void
}

function RemoteTile({
  stream,
  label,
}: {
  stream: MediaStream
  label: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    void v.play().catch(() => {})
  }, [stream])
  return (
    <figure className="stage__remote">
      <video ref={ref} autoPlay playsInline muted />
      <figcaption>{label}</figcaption>
    </figure>
  )
}

export function ScreenShareStage({
  localStream,
  remoteStreams,
  sharing,
  peers,
  onStartShare,
  onStopShare,
}: Props) {
  const localRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = localRef.current
    if (!v) return
    v.srcObject = localStream
    if (localStream) void v.play().catch(() => {})
  }, [localStream])

  const peerName = (id: string) =>
    peers.find((p) => p.clientId === id)?.displayName ?? id.slice(0, 8)

  return (
    <section className="stage">
      <header className="stage__header">
        <h2>Shared screen</h2>
        <div className="stage__actions">
          {!sharing ? (
            <button type="button" className="btn primary" onClick={onStartShare}>
              Share your screen
            </button>
          ) : (
            <button type="button" className="btn danger" onClick={onStopShare}>
              Stop sharing
            </button>
          )}
        </div>
      </header>
      <p className="stage__hint">
        Pick a browser tab, window, or entire display. Others in this room see it
        here once they connect (WebRTC/STUN; same room id required).
      </p>

      <div className="stage__grid">
        <figure className="stage__local">
          <video ref={localRef} autoPlay playsInline muted />
          <figcaption>{sharing ? 'You (local preview)' : 'Your preview'}</figcaption>
        </figure>

        {Array.from(remoteStreams.entries()).map(([id, stream]) => (
          <RemoteTile key={id} stream={stream} label={peerName(id)} />
        ))}

        {remoteStreams.size === 0 && !sharing && (
          <p className="stage__empty">No remote shares yet.</p>
        )}
      </div>
    </section>
  )
}
