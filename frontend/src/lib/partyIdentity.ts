const STORAGE_KEY = 'watchparty-client-id'

export function getOrCreateClientId(): string {
  let id = sessionStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
