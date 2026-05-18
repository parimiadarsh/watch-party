import { useEffect } from 'react'
import { useWebRtcShare } from '../hooks/useWebRtcShare'
import { usePartyRoom } from '../hooks/usePartyRoom'
import { getSessionToken, saveRoomVisit } from '../lib/accountApi'
import { ChatPanel } from './ChatPanel'
import { ScreenShareStage } from './ScreenShareStage'
import { PlaybackWatchSection } from './playback/PlaybackWatchSection'
import './RoomView.css'

type Props = {
  roomId: string
  displayName: string
  onLeave: () => void
  onSignOut: () => void
}

export function RoomView({ roomId, displayName, onLeave, onSignOut }: Props) {
  const signedIn = !!getSessionToken()
  useEffect(() => {
    void saveRoomVisit(roomId)
  }, [roomId])

  const room = usePartyRoom(roomId, displayName)
  const rtc = useWebRtcShare(
    room.clientId,
    room.peers,
    room.connected,
    room.sendSignal,
    room.subscribeSignals,
    room.subscribeShareState,
    room.sendShareState,
  )

  return (
    <div className="room">
      <header className="room__bar">
        <div className="room__title">
          <p className="eyebrow">Now streaming</p>
          <p className="room__id" title={roomId}>
            {roomId}
          </p>
          <p className="room__you">
            You are <strong>{displayName}</strong>
            {room.connected ? (
              <span className="room__dot room__dot--on">Connected</span>
            ) : (
              <span className="room__dot">Connecting…</span>
            )}
          </p>
        </div>
        <div className="room__actions">
          {signedIn && (
            <button type="button" className="btn ghost" onClick={onSignOut}>
              Sign out
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      <p className="room__peers">
        {room.peers.length === 0
          ? 'No one else in this room yet — share the id.'
          : `${room.peers.length} other(s): ${room.peers.map((p) => p.displayName).join(', ')}`}
      </p>

      <div className="room__body">
        <div className="room__main">
          <ScreenShareStage
            localStream={rtc.localStream}
            remoteStreams={rtc.remoteStreams}
            sharing={rtc.sharing}
            peers={room.peers}
            onStartShare={rtc.startSharing}
            onStopShare={rtc.stopSharing}
          />
          <PlaybackWatchSection
            clientId={room.clientId}
            displayName={displayName}
            peers={room.peers}
            playbackControl={room.playbackControl}
            sendPlaybackIntent={room.sendPlaybackIntent}
            setPlaybackMode={room.setPlaybackMode}
            setController={room.setController}
            subscribePlayback={room.subscribePlayback}
          />
        </div>
        <ChatPanel messages={room.chat} onSend={room.sendChat} />
      </div>
    </div>
  )
}
