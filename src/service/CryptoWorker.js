/**
 * crypto.worker.js
 * Salvar em: src/crypto/cryptoWorker.js
 *
 * Web Worker isolado para executar PBKDF2 sem bloquear a main thread.
 * Recebe { uid, salt } e responde { wrappingKeyJwk } ou { error }.
 */

self.onmessage = async ({ data }) => {
  const { uid, salt } = data

  try {
    const uidBytes = new TextEncoder().encode(uid)
    const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0))

    // Importar o UID como material base PBKDF2
    const baseKey = await crypto.subtle.importKey(
      'raw',
      uidBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    // Derivar AES-GCM 256 bits — 600k iterações (OWASP 2024, SHA-256)
    const wrappingKey = await crypto.subtle.deriveKey(
      {
        name:       'PBKDF2',
        salt:       saltBytes,
        iterations: 600_000,
        hash:       'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,               // exportável apenas para transferir via postMessage
      ['wrapKey', 'unwrapKey']
    )

    const wrappingKeyJwk = await crypto.subtle.exportKey('jwk', wrappingKey)

    self.postMessage({ wrappingKeyJwk })

  } catch (error) {
    self.postMessage({ error: error.message ?? String(error) })
  }
}