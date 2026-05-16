import { getOrCreateClientId } from './partyIdentity'

export function buildRoomWebSocketUrl(
  roomId: string,
  displayName: string,
): string {
  const clientId = getOrCreateClientId()
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const params = new URLSearchParams({
    room: roomId,
    clientId,
    name: displayName,
  })
  return `${proto}//${window.location.host}/ws?${params}`
}
