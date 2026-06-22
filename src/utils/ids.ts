export function createId(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('Secure ID generation is not available in this browser.')
  }

  return globalThis.crypto.randomUUID()
}
