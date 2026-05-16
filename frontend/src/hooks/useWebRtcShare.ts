import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Peer,
  ShareStateMessage,
  SignalMessage,
  SignalPayload,
} from './usePartyRoom'

const ICE: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

/** Bias toward high-res capture; real size/FPS still depend on the display and browser. */
const DISPLAY_VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { max: 3840, ideal: 1920 },
  height: { max: 2160, ideal: 1080 },
  frameRate: { max: 60, ideal: 30 },
}

/**
 * Raise WebRTC encoder budget so screen share isn’t stuck at a low default bitrate.
 * Senders still adapt if the network is poor.
 */
async function preferHighOutboundVideo(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'video') continue
    const params = sender.getParameters()
    if (!params.encodings?.length) continue
    for (const enc of params.encodings) {
      enc.maxBitrate = 12_000_000
      enc.scaleResolutionDownBy = 1
    }
    try {
      await sender.setParameters(params)
    } catch {
      /* optional; some browsers are picky about timing */
    }
  }
}

export function useWebRtcShare(
  clientId: string,
  peers: Peer[],
  connected: boolean,
  sendSignal: (targetId: string | undefined, payload: SignalPayload) => void,
  subscribeSignals: (fn: (msg: SignalMessage) => void) => () => void,
  subscribeShareState: (fn: (msg: ShareStateMessage) => void) => () => void,
  sendShareState: (sharing: boolean) => void,
) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    () => new Map(),
  )
  const [sharing, setSharing] = useState(false)

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const offerInFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    localStreamRef.current = localStream
  }, [localStream])

  const closeAllPeerConnections = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    offerInFlightRef.current.clear()
    setRemoteStreams(new Map())
  }, [])

  const stopSharing = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    setLocalStream(null)
    setSharing(false)
    sendShareState(false)
    closeAllPeerConnections()
  }, [closeAllPeerConnections, sendShareState])

  const ensureBroadcasterPc = useCallback(
    async (remoteId: string) => {
      const stream = localStreamRef.current
      if (!stream) return

      let pc = pcsRef.current.get(remoteId)
      if (!pc || pc.signalingState === 'closed') {
        const fresh = new RTCPeerConnection(ICE)
        pcsRef.current.set(remoteId, fresh)
        stream.getTracks().forEach((t) => fresh.addTrack(t, stream))
        fresh.onicecandidate = (e) => {
          if (e.candidate) {
            sendSignal(remoteId, {
              kind: 'ice',
              candidate: e.candidate.toJSON(),
            })
          }
        }
        pc = fresh
      }

      if (pc.signalingState === 'have-local-offer') {
        return
      }
      if (pc.remoteDescription != null) {
        return
      }
      if (offerInFlightRef.current.has(remoteId)) {
        return
      }

      offerInFlightRef.current.add(remoteId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        sendSignal(remoteId, { kind: 'offer', sdp: offer.sdp! })
      } finally {
        offerInFlightRef.current.delete(remoteId)
      }
    },
    [sendSignal],
  )

  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: DISPLAY_VIDEO_CONSTRAINTS,
        audio: true,
      })
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopSharing()
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      setSharing(true)
      sendShareState(true)
      peers
        .filter((p) => p.clientId !== clientId)
        .forEach((p) => void ensureBroadcasterPc(p.clientId))
    } catch {
      /* dismissed */
    }
  }, [clientId, peers, ensureBroadcasterPc, sendShareState, stopSharing])

  useEffect(() => {
    if (!sharing || !localStream) return
    peers
      .filter((p) => p.clientId !== clientId)
      .forEach((p) => void ensureBroadcasterPc(p.clientId))
  }, [peers, sharing, localStream, clientId, ensureBroadcasterPc])

  useEffect(() => {
    const remoteIds = new Set(peers.map((p) => p.clientId))
    pcsRef.current.forEach((pc, remoteId) => {
      if (!remoteIds.has(remoteId)) {
        pc.close()
        pcsRef.current.delete(remoteId)
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(remoteId)
          return next
        })
      }
    })
  }, [peers])

  useEffect(() => {
    const unsub = subscribeSignals(async (msg: SignalMessage) => {
      const { fromId, payload } = msg
      if (fromId === clientId) return

      if (payload.kind === 'request-offer') {
        if (localStreamRef.current) {
          await ensureBroadcasterPc(fromId)
        }
        return
      }

      if (payload.kind === 'offer') {
        let pc = pcsRef.current.get(fromId)
        if (pc) {
          pc.close()
        }
        pc = new RTCPeerConnection(ICE)
        pcsRef.current.set(fromId, pc)
        pc.ontrack = (e) => {
          setRemoteStreams((prev) => new Map(prev).set(fromId, e.streams[0]))
        }
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            sendSignal(fromId, {
              kind: 'ice',
              candidate: e.candidate.toJSON(),
            })
          }
        }
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        sendSignal(fromId, { kind: 'answer', sdp: answer.sdp! })
        return
      }

      if (payload.kind === 'answer') {
        const pc = pcsRef.current.get(fromId)
        if (pc) {
          await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
          if (localStreamRef.current) {
            await preferHighOutboundVideo(pc)
          }
        }
        return
      }

      if (payload.kind === 'ice') {
        const pc = pcsRef.current.get(fromId)
        if (pc && payload.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } catch {
            /* out of order ICE; ignore for dev */
          }
        }
      }
    })
    return unsub
  }, [subscribeSignals, clientId, sendSignal, ensureBroadcasterPc])

  useEffect(() => {
    const unsub = subscribeShareState((msg) => {
      if (msg.fromId === clientId) return
      if (msg.sharing) {
        sendSignal(msg.fromId, { kind: 'request-offer' })
      } else {
        const pc = pcsRef.current.get(msg.fromId)
        if (pc) {
          pc.close()
          pcsRef.current.delete(msg.fromId)
        }
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(msg.fromId)
          return next
        })
      }
    })
    return unsub
  }, [subscribeShareState, clientId, sendSignal])

  useEffect(() => {
    if (!connected) {
      closeAllPeerConnections()
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
        localStreamRef.current = null
      }
      setLocalStream(null)
      setSharing(false)
    }
  }, [connected, closeAllPeerConnections])

  return {
    localStream,
    remoteStreams,
    sharing,
    startSharing,
    stopSharing,
  }
}
