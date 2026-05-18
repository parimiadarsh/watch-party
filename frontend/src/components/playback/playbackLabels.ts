import type { Peer } from '../../hooks/usePartyRoom'

export function peerLabel(
  id: string,
  clientId: string,
  displayName: string,
  peers: Peer[],
) {
  if (id === clientId) return `${displayName} (you)`
  return peers.find((p) => p.clientId === id)?.displayName ?? id.slice(0, 8)
}
