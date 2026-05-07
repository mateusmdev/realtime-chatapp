
export const CryptoInitStatus = Object.freeze({
  GENERATED:                   'GENERATED',
  READY:                       'READY',
  LOCAL_FOUND_REMOTE_MISSING:  'LOCAL_FOUND_REMOTE_MISSING',
  REMOTE_FOUND_LOCAL_MISSING:  'REMOTE_FOUND_LOCAL_MISSING',
  ERROR:                       'ERROR',
})

const APP_HARDCODED_SALT = 'y0hZ1WY1IrO3uKfrAcjVgkhdZfaGnnDeyzSlg7DMrOc='

const ECDH_ALGO    = { name: 'ECDH', namedCurve: 'P-256' }
const HKDF_HASH    = 'SHA-256'
const AES_GCM_ALGO = { name: 'AES-GCM', length: 256 }
const AES_KW_ALGO  = { name: 'AES-KW',  length: 256 }

const IDB_DB_NAME    = 'e2e-crypto-store'
const IDB_STORE_NAME = 'keys'
const IDB_VERSION    = 1

class CryptoService {

  #privateKey   = null
  #publicKey    = null
  #publicKeyJwk = null
  #userId       = null
  #ready        = false



  async init(firebaseUid, firestoreUserDoc, persistToFirestore) {
    this.#userId = firebaseUid

    const localKey     = await this.#loadPrivateKeyFromIDB()
    const remoteKeyJwk = firestoreUserDoc?.encryptedPrivateKey ?? null
    const remotePubJwk = firestoreUserDoc?.publicKey ?? null

    if (localKey && remoteKeyJwk) {
      this.#privateKey   = localKey
      this.#publicKeyJwk = remotePubJwk
      this.#publicKey    = await this.#importPublicKeyJwk(remotePubJwk)
      this.#ready        = true
      return CryptoInitStatus.READY
    }

    if (localKey && !remoteKeyJwk) {
      const wrappingKey = await this.#deriveWrappingKey(firebaseUid)
      const { publicKeyJwk, encryptedPrivateKeyB64, runtimePrivateKey } =
        await this.#generateAndWrap(wrappingKey)

      this.#privateKey   = runtimePrivateKey
      this.#publicKeyJwk = publicKeyJwk
      this.#publicKey    = await this.#importPublicKeyJwk(publicKeyJwk)

      await persistToFirestore({
        publicKey:           publicKeyJwk,
        encryptedPrivateKey: encryptedPrivateKeyB64,
      })

      await this.#storePrivateKeyInIDB(runtimePrivateKey)

      this.#ready = true
      return CryptoInitStatus.LOCAL_FOUND_REMOTE_MISSING
    }

    if (!localKey && remoteKeyJwk) {
      const wrappingKey = await this.#deriveWrappingKey(firebaseUid)
      const privateKey  = await this.#unwrapPrivateKey(remoteKeyJwk, wrappingKey)

      this.#privateKey   = privateKey
      this.#publicKeyJwk = remotePubJwk
      this.#publicKey    = await this.#importPublicKeyJwk(remotePubJwk)

      await this.#storePrivateKeyInIDB(privateKey)

      this.#ready = true
      return CryptoInitStatus.REMOTE_FOUND_LOCAL_MISSING
    }

    const wrappingKey = await this.#deriveWrappingKey(firebaseUid)
    const { publicKeyJwk, encryptedPrivateKeyB64, runtimePrivateKey } =
      await this.#generateAndWrap(wrappingKey)

    this.#privateKey   = runtimePrivateKey
    this.#publicKeyJwk = publicKeyJwk
    this.#publicKey    = await this.#importPublicKeyJwk(publicKeyJwk)

    await persistToFirestore({
      publicKey:           publicKeyJwk,
      encryptedPrivateKey: encryptedPrivateKeyB64,
    })

    await this.#storePrivateKeyInIDB(runtimePrivateKey)

    this.#ready = true
    return CryptoInitStatus.GENERATED
  }

  getPublicKeyJwk() {
    return this.#publicKeyJwk
  }


  get isReady() {
    return this.#ready
  }

  async encryptMessage(plaintext, recipientPublicJwk) {
    this.#assertReady()

    const recipientPubKey = await this.#importPublicKeyJwk(recipientPublicJwk)

    const ephemeralPair = await crypto.subtle.generateKey(ECDH_ALGO, true, [
      'deriveKey', 'deriveBits'
    ])

    const wrapKey = await this.#deriveMessageWrapKey(
      ephemeralPair.privateKey,
      recipientPubKey
    )

    const sessionKey = await crypto.subtle.generateKey(AES_GCM_ALGO, true, [
      'encrypt', 'decrypt'
    ])

    const iv = crypto.getRandomValues(new Uint8Array(12))

    const [encryptedBuffer, wrappedKeyBuffer, ephemeralPublicKey] = await Promise.all([
      crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sessionKey,
        new TextEncoder().encode(plaintext)
      ),
      crypto.subtle.wrapKey('raw', sessionKey, wrapKey, { name: 'AES-KW' }),
      crypto.subtle.exportKey('jwk', ephemeralPair.publicKey),
    ])

    return {
      encrypted:          true,
      iv:                 this.#bufToB64(iv),
      encryptedContent:   this.#bufToB64(encryptedBuffer),
      encryptedKey:       this.#bufToB64(wrappedKeyBuffer),
      ephemeralPublicKey,
    }
  }

  async decryptMessage(payload) {
    this.#assertReady()

    const { iv, encryptedContent, encryptedKey, ephemeralPublicKey } = payload

    const ephemeralPubKey = await this.#importPublicKeyJwk(ephemeralPublicKey)

    const wrapKey = await this.#deriveMessageWrapKey(
      this.#privateKey,
      ephemeralPubKey
    )

    const sessionKey = await crypto.subtle.unwrapKey(
      'raw',
      this.#b64ToBuf(encryptedKey),
      wrapKey,
      { name: 'AES-KW' },
      AES_GCM_ALGO,
      false,
      ['decrypt']
    )

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.#b64ToBuf(iv) },
      sessionKey,
      this.#b64ToBuf(encryptedContent)
    )

    return new TextDecoder().decode(decryptedBuffer)
  }

  async importContactPublicKey(jwk) {
    return this.#importPublicKeyJwk(jwk)
  }

  async #deriveWrappingKey(uid) {
    const wrappingKeyJwk = await this.#runPbkdf2InWorker(uid)

    return crypto.subtle.importKey(
      'jwk',
      wrappingKeyJwk,
      { name: 'AES-GCM' },
      false,
      ['wrapKey', 'unwrapKey']
    )
  }

  #runPbkdf2InWorker(uid) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./CryptoWorker.js', import.meta.url),
        { type: 'module' }
      )

      worker.onmessage = ({ data }) => {
        worker.terminate()
        if (data.error) {
          reject(new Error(`Worker PBKDF2 error: ${data.error}`))
        } else {
          resolve(data.wrappingKeyJwk)
        }
      }

      worker.onerror = (err) => {
        worker.terminate()
        reject(new Error(`Worker error: ${err.message}`))
      }

      worker.postMessage({ uid, salt: APP_HARDCODED_SALT })
    })
  }

  async #generateAndWrap(wrappingKey) {
    const keyPair = await crypto.subtle.generateKey(
      ECDH_ALGO,
      true,
      ['deriveKey', 'deriveBits']
    )

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const wrappedBuffer = await crypto.subtle.wrapKey(
      'pkcs8',
      keyPair.privateKey,
      wrappingKey,
      { name: 'AES-GCM', iv }
    )

    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(wrappedBuffer), iv.length)

    const runtimePrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      await crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
      ECDH_ALGO,
      false,
      ['deriveKey', 'deriveBits']
    )

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

    return {
      publicKeyJwk,
      encryptedPrivateKeyB64: this.#bufToB64(combined),
      runtimePrivateKey,
    }
  }

  async #unwrapPrivateKey(encryptedPrivateKeyB64, wrappingKey) {
    const combined = this.#b64ToBuf(encryptedPrivateKeyB64)
    const iv       = combined.slice(0, 12)
    const wrapped  = combined.slice(12)

    return crypto.subtle.unwrapKey(
      'pkcs8',
      wrapped,
      wrappingKey,
      { name: 'AES-GCM', iv },
      ECDH_ALGO,
      false,
      ['deriveKey', 'deriveBits']
    )
  }


  async #importPublicKeyJwk(jwk) {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      ECDH_ALGO,
      true,
      []
    )
  }


  async #deriveMessageWrapKey(privateKey, publicKey) {
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: publicKey },
      privateKey,
      256
    )

    const hkdfKey = await crypto.subtle.importKey(
      'raw', sharedBits, { name: 'HKDF' }, false, ['deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: HKDF_HASH,
        salt: new Uint8Array(32),
        info: new TextEncoder().encode('e2e-chat-message-wrap-v1'),
      },
      hkdfKey,
      AES_KW_ALGO,
      false,
      ['wrapKey', 'unwrapKey']
    )
  }


  #openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION)

      req.onupgradeneeded = ({ target }) => {
        const db = target.result
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME)
        }
      }

      req.onsuccess = ({ target }) => resolve(target.result)
      req.onerror   = ({ target }) => reject(target.error)
    })
  }

  async #storePrivateKeyInIDB(privateKey) {
    const db = await this.#openIDB()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(IDB_STORE_NAME, 'readwrite')
      const req = tx.objectStore(IDB_STORE_NAME).put(privateKey, `privkey:${this.#userId}`)
      req.onsuccess = () => resolve()
      req.onerror   = ({ target }) => reject(target.error)
    })
  }

  async #loadPrivateKeyFromIDB() {
    try {
      const db = await this.#openIDB()
      return new Promise((resolve, reject) => {
        const tx  = db.transaction(IDB_STORE_NAME, 'readonly')
        const req = tx.objectStore(IDB_STORE_NAME).get(`privkey:${this.#userId}`)
        req.onsuccess = ({ target }) => resolve(target.result ?? null)
        req.onerror   = ({ target }) => reject(target.error)
      })
    } catch {
      return null
    }
  }


  #assertReady() {
    if (!this.#ready) {
      throw new Error('CryptoService não está inicializado. Chame await cryptoService.init() primeiro.')
    }
  }

  #bufToB64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    return btoa(String.fromCharCode(...bytes))
  }

  #b64ToBuf(b64) {
    const binary = atob(b64)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
}

export default new CryptoService()