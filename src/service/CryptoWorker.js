self.onmessage = async ({ data }) => {
  const { uid, salt } = data

  try {
    const uidBytes  = new TextEncoder().encode(uid)
    const saltBytes = new TextEncoder().encode(salt)

    const baseKey = await crypto.subtle.importKey(
      'raw',
      uidBytes,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    const wrappingKey = await crypto.subtle.deriveKey(
      {
        name:       'PBKDF2',
        salt:       saltBytes,
        iterations: 600_000,
        hash:       'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['wrapKey', 'unwrapKey']
    )

    const wrappingKeyJwk = await crypto.subtle.exportKey('jwk', wrappingKey)

    self.postMessage({ wrappingKeyJwk })

  } catch (error) {
    self.postMessage({ error: error.message ?? String(error) })
  }
}