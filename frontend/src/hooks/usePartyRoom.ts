import { useCallback, useEffect, useRef, useState } from 'react'
import { buildRoomWebSocketUrl } from '../lib/wsUrl'
import { getOrCreateClientId } from '../lib/partyIdentity'

export type Peer = { clientId: string; displayName: string }

export type ChatMessage = {
  type: 'chat'
  fromId: string
  fromName: string
  text: string
  at: number
}

export type SignalPayload =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: RTCIceCandidateInit }
  | { kind: 'request-offer' }

export type SignalMessage = {
  type: 'signal'
  fromId: string
  payload: SignalPayload
}

export type PlaybackControlMode = 'single' | 'dual'

export type PlaybackControlState = {
  controlMode: PlaybackControlMode
  controllerId: string | null
  playReady: string[]
  peerCount: number
}

export type PlaybackControlStateMessage = {
  type: 'playback-control-state'
} & PlaybackControlState

export type PlaybackMessage = {
  type: 'playback'
  fromId: string
  action: string
  currentTime?: number
  videoUrl?: string
  emittedAt: number
}

export type ShareStateMessage = {
  type: 'share-state'
  fromId: string
  sharing: boolean
}

type Inbound =
  | { type: 'roster'; peers: Peer[] }
  | ChatMessage
  | SignalMessage
  | PlaybackMessage
  | PlaybackControlStateMessage
  | ShareStateMessage
  | { type: 'peer-joined'; clientId: string; displayName: string }
  | { type: 'peer-left'; clientId: string }

const defaultPlaybackControl: PlaybackControlState = {
  controlMode: 'dual',
  controllerId: null,
  playReady: [],
  peerCount: 1,
}

export function usePartyRoom(roomId: string | null, displayName: string) {
  const clientIdRef = useRef<string | null>(null)
  if (!clientIdRef.current) {
    clientIdRef.current = getOrCreateClientId()
  }
  const clientId = clientIdRef.current
  const [connected, setConnected] = useState(false)
  const [peers, setPeers] = useState<Peer[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [playbackControl, setPlaybackControl] =
    useState<PlaybackControlState>(defaultPlaybackControl)
  const wsRef = useRef<WebSocket | null>(null)

  const signalHandlersRef = useRef(new Set<(msg: SignalMessage) => void>())
  const subscribeSignals = useCallback((fn: (msg: SignalMessage) => void) => {
    signalHandlersRef.current.add(fn)
    return () => {
      signalHandlersRef.current.delete(fn)
    }
  }, [])

  const playbackHandlersRef = useRef(new Set<(msg: PlaybackMessage) => void>())
  const subscribePlayback = useCallback((fn: (msg: PlaybackMessage) => void) => {
    playbackHandlersRef.current.add(fn)
    return () => {
      playbackHandlersRef.current.delete(fn)
    }
  }, [])

  const shareStateHandlersRef = useRef(
    new Set<(msg: ShareStateMessage) => void>(),
  )
  const subscribeShareState = useCallback(
    (fn: (msg: ShareStateMessage) => void) => {
      shareStateHandlersRef.current.add(fn)
      return () => {
        shareStateHandlersRef.current.delete(fn)
      }
    },
    [],
  )

  const send = useCallback((obj: object) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj))
    }
  }, [])

  useEffect(() => {
    if (!roomId) return

    const url = buildRoomWebSocketUrl(roomId, displayName)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      setPlaybackControl(defaultPlaybackControl)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as Inbound
        switch (msg.type) {
          case 'roster':
            setPeers(msg.peers)
            break
          case 'peer-joined':
            setPeers((p) => [
              ...p.filter((x) => x.clientId !== msg.clientId),
              {
                clientId: msg.clientId,
                displayName: msg.displayName,
              },
            ])
            break
          case 'peer-left':
            setPeers((p) => p.filter((x) => x.clientId !== msg.clientId))
            break
          case 'chat':
            setChat((c) => [...c, msg])
            break
          case 'signal':
            signalHandlersRef.current.forEach((fn) => fn(msg))
            break
          case 'playback':
            playbackHandlersRef.current.forEach((fn) => fn(msg))
            break
          case 'playback-control-state':
            setPlaybackControl({
              controlMode: msg.controlMode,
              controllerId: msg.controllerId,
              playReady: msg.playReady,
              peerCount: msg.peerCount,
            })
            break
          case 'share-state':
            shareStateHandlersRef.current.forEach((fn) => fn(msg))
            break
        }
      } catch {
        /* malformed */
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [roomId, displayName])

  const sendChat = useCallback((text: string) => send({ type: 'chat', text }), [send])

  const sendSignal = useCallback(
    (targetId: string | undefined, payload: SignalPayload) =>
      send({ type: 'signal', targetId, payload }),
    [send],
  )

  const sendPlaybackIntent = useCallback(
    (action: string, currentTime?: number, videoUrl?: string) =>
      send({ type: 'playback-intent', action, currentTime, videoUrl }),
    [send],
  )

  const setPlaybackMode = useCallback(
    (mode: PlaybackControlMode) =>
      send({ type: 'playback-control', op: 'setMode', mode }),
    [send],
  )

  const claimController = useCallback(
    () => send({ type: 'playback-control', op: 'claimController' }),
    [send],
  )

  const setController = useCallback(
    (controllerId: string) =>
      send({ type: 'playback-control', op: 'setController', controllerId }),
    [send],
  )

  const sendShareState = useCallback(
    (sharing: boolean) => send({ type: 'share-state', sharing }),
    [send],
  )

  return {
    clientId,
    connected,
    peers,
    chat,
    playbackControl,
    sendChat,
    sendSignal,
    sendPlaybackIntent,
    setPlaybackMode,
    claimController,
    setController,
    sendShareState,
    subscribeSignals,
    subscribePlayback,
    subscribeShareState,
  }
}
