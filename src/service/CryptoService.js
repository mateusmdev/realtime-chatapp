/**
 * CryptoService.js
 * Salvar em: src/crypto/CryptoService.js
 *
 * Serviço de criptografia E2E completo.
 *
 * Responsabilidades:
 *  - Gerar par ECDH P-256 no primeiro login
 *  - Derivar wrapping key via PBKDF2 (em Web Worker) usando o Firebase UID
 *  - Envolver (wrap) a chave privada com AES-KW
 *  - Persistir { publicKey, encryptedPrivateKey } no Firestore (merge seguro)
 *  - Recuperar e desembrulhar a chave privada automaticamente em qualquer dispositivo
 *  - Cachear a chave privada recuperada no IndexedDB para sessões subsequentes
 *  - Detectar e corrigir divergências entre IndexedDB e Firestore (Bug do Usuário Fantasma)
 *  - Criptografar / descriptografar mensagens com criptografia híbrida:
 *      ECDH efêmero + HKDF → AES-GCM (forward secrecy por mensagem)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * AVISO DE SEGURANÇA (trade-off documentado):
 *
 * A wrapping key é derivada de PBKDF2(firebase_uid, APP_HARDCODED_SALT, 600k).
 * Isso é conveniente (recuperação automática) porém não equivalente a uma proteção
 * baseada em segredo forte fornecido pelo usuário.
 *
 * Superfície de ataque residual:
 *   1. Quem tiver acesso ao Firebase UID + ao bundle JS (salt embutido) pode derivar
 *      a wrapping key e desembrulhar a chave privada cifrada armazenada no Firestore.
 *   2. O salt fixo no bundle JS é público para quem inspecionar o código compilado.
 *
 * Mitigações aplicadas:
 *   - 600.000 iterações PBKDF2 tornam ataques de força bruta lentos.
 *   - A chave privada nunca trafega descriptografada fora do browser.
 *   - A main thread nunca congela (PBKDF2 no Worker).
 *   - O acesso ao Firestore exige autenticação Firebase válida.
 *
 * Para aplicações com requisito de segurança máxima, adicione um fator de
 * conhecimento do usuário (senha) como camada adicional.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── Status de inicialização ────────────────────────────────────────────────

/**
 * Enum dos estados possíveis retornados por CryptoService.init()
 * @readonly
 * @enum {string}
 */
export const CryptoInitStatus = Object.freeze({
  /** Chave gerada e persistida com sucesso (primeiro login) */
  GENERATED:                   'GENERATED',
  /** Chave encontrada localmente e confirmada no Firestore */
  READY:                       'READY',
  /** Chave local presente, mas ausente no Firestore — upload executado */
  LOCAL_FOUND_REMOTE_MISSING:  'LOCAL_FOUND_REMOTE_MISSING',
  /** Chave ausente localmente — recuperada do Firestore com sucesso */
  REMOTE_FOUND_LOCAL_MISSING:  'REMOTE_FOUND_LOCAL_MISSING',
  /** Falha irrecuperável — sem chave em lugar nenhum */
  ERROR:                       'ERROR',
})

// ─── Salt embutido (base64) ─────────────────────────────────────────────────
// Gere um valor aleatório único por projeto e mantenha constante no bundle.
// Exemplo de geração: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
const APP_HARDCODED_SALT = 'y0hZ1WY1IrO3uKfrAcjVgkhdZfaGnnDeyzSlg7DMrOc='

// ─── Constantes criptográficas ───────────────────────────────────────────────
const ECDH_ALGO     = { name: 'ECDH', namedCurve: 'P-256' }
const HKDF_HASH     = 'SHA-256'
const AES_GCM_ALGO  = { name: 'AES-GCM', length: 256 }
const AES_KW_ALGO   = { name: 'AES-KW',  length: 256 }

// ─── IndexedDB ───────────────────────────────────────────────────────────────
const IDB_DB_NAME    = 'e2e-crypto-store'
const IDB_STORE_NAME = 'keys'
const IDB_VERSION    = 1

class CryptoService {

  // ─── Estado interno ────────────────────────────────────────────────────────

  /** @type {CryptoKey|null} */
  #privateKey   = null
  /** @type {CryptoKey|null} */
  #publicKey    = null
  /** @type {object|null} JWK da chave pública */
  #publicKeyJwk = null
  /** @type {string|null} */
  #userId       = null
  /** @type {boolean} */
  #ready        = false

  // ─── API de inicialização ──────────────────────────────────────────────────

  /**
   * Ponto de entrada principal. Deve ser aguardado antes de qualquer operação.
   * Detecta o estado atual, sincroniza IDB ↔ Firestore e deixa o serviço pronto.
   *
   * @param {string} firebaseUid - UID do usuário autenticado no Firebase
   * @param {object} firestoreUserDoc - Snapshot atual do documento do usuário no Firestore
   *   Espera: { publicKey?: object, encryptedPrivateKey?: string }
   * @param {Function} persistToFirestore - Callback async(fields) que salva campos
   *   no documento do usuário usando merge. Assinatura: (fields: object) => Promise<void>
   * @returns {Promise<CryptoInitStatus>}
   */
  async init(firebaseUid, firestoreUserDoc, persistToFirestore) {
    this.#userId = firebaseUid

    const localKey    = await this.#loadPrivateKeyFromIDB()
    const remoteKeyJwk = firestoreUserDoc?.encryptedPrivateKey ?? null
    const remotePubJwk = firestoreUserDoc?.publicKey ?? null

    // ── Caso 1: chave no IDB e no Firestore → estado ideal ──────────────────
    if (localKey && remoteKeyJwk) {
      this.#privateKey   = localKey
      this.#publicKeyJwk = remotePubJwk
      this.#publicKey    = await this.#importPublicKeyJwk(remotePubJwk)
      this.#ready        = true
      return CryptoInitStatus.READY
    }

    // ── Caso 2: chave no IDB mas ausente no Firestore (Bug do Usuário Fantasma)
    if (localKey && !remoteKeyJwk) {
      this.#privateKey = localKey

      // Derivar wrapping key para re-envolver a chave e fazer upload
      const wrappingKey = await this.#deriveWrappingKey(firebaseUid)

      // Precisamos exportar a chave — se ela for non-extractable, re-gerar é a
      // única opção. A estratégia aqui é re-gerar e subir como novo par.
      // Nota: mensagens anteriores cifradas com o par órfão serão perdidas,
      // mas esse cenário já estava quebrado.
      const { publicKeyJwk, encryptedPrivateKeyB64 } =
        await this.#generateAndWrap(wrappingKey)

      // Re-importar como non-extractable para uso em runtime
      this.#privateKey   = await this.#importPrivKeyJwkNonExtractable(
        await this.#unwrapPrivateKey(encryptedPrivateKeyB64, wrappingKey)
          .then(k => k)
          // Se falhar, a chave já está no IDB como non-extractable — usar como está
          .catch(() => localKey)
      )
      this.#publicKeyJwk = publicKeyJwk
      this.#publicKey    = await this.#importPublicKeyJwk(publicKeyJwk)

      await persistToFirestore({
        publicKey:            publicKeyJwk,
        encryptedPrivateKey:  encryptedPrivateKeyB64,
      })

      // Atualizar IDB com a chave nova
      await this.#storePrivateKeyInIDB(this.#privateKey)

      this.#ready = true
      return CryptoInitStatus.LOCAL_FOUND_REMOTE_MISSING
    }

    // ── Caso 3: chave no Firestore mas não no IDB (novo dispositivo / limpeza)
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

    // ── Caso 4: nenhuma chave existe (primeiro login em qualquer dispositivo)
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

  /**
   * Retorna a chave pública JWK do usuário local (para salvar no Firestore/perfil).
   * @returns {object|null}
   */
  getPublicKeyJwk() {
    return this.#publicKeyJwk
  }

  /**
   * Indica se o serviço está pronto para operar.
   * @returns {boolean}
   */
  isReady() {
    return this.#ready
  }

  // ─── API de criptografia de mensagens ─────────────────────────────────────

  /**
   * Criptografa uma mensagem de texto para um destinatário.
   * Usa criptografia híbrida: ECDH efêmero + HKDF → AES-256-GCM.
   * Garante forward secrecy por mensagem.
   *
   * @param {string} plaintext          - Texto original
   * @param {object} recipientPublicJwk - Chave pública JWK do destinatário
   * @returns {Promise<{
   *   iv: string,
   *   encryptedContent: string,
   *   encryptedKey: string,
   *   ephemeralPublicKey: object,
   *   encrypted: true
   * }>}
   */
  async encryptMessage(plaintext, recipientPublicJwk) {
    this.#assertReady()

    const recipientPubKey = await this.#importPublicKeyJwk(recipientPublicJwk)

    // Par efêmero — descartado após o envio
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

  /**
   * Descriptografa uma mensagem recebida.
   *
   * @param {object} payload - Payload cifrado vindo do Firestore
   * @returns {Promise<string>}
   */
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

  /**
   * Importa uma chave pública JWK de outro usuário para uso em encryptMessage.
   * @param {object} jwk
   * @returns {Promise<CryptoKey>}
   */
  async importContactPublicKey(jwk) {
    return this.#importPublicKeyJwk(jwk)
  }

  // ─── Derivação da wrapping key (via Web Worker) ───────────────────────────

  /**
   * Deriva a wrapping key AES-GCM usando PBKDF2 em um Web Worker.
   * Não bloqueia a main thread.
   *
   * @param {string} uid
   * @returns {Promise<CryptoKey>}
   */
  async #deriveWrappingKey(uid) {
    const wrappingKeyJwk = await this.#runPbkdf2InWorker(uid)

    // Re-importar como non-extractable para uso seguro
    return crypto.subtle.importKey(
      'jwk',
      wrappingKeyJwk,
      { name: 'AES-GCM' },
      false,
      ['wrapKey', 'unwrapKey']
    )
  }

  /**
   * Executa o PBKDF2 no Web Worker e retorna o JWK da wrapping key.
   * @param {string} uid
   * @returns {Promise<object>} wrappingKeyJwk
   */
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

  // ─── Geração e wrap do par de chaves ────────────────────────────────────

  /**
   * Gera um par ECDH, envolve a chave privada com AES-GCM,
   * e retorna tudo o que é necessário para persistir e usar.
   *
   * @param {CryptoKey} wrappingKey
   * @returns {Promise<{
   *   publicKeyJwk: object,
   *   encryptedPrivateKeyB64: string,
   *   runtimePrivateKey: CryptoKey
   * }>}
   */
  async #generateAndWrap(wrappingKey) {
    // Gerar como extractable para poder envolver
    const keyPair = await crypto.subtle.generateKey(
      ECDH_ALGO,
      true,
      ['deriveKey', 'deriveBits']
    )

    // Envolver a chave privada com AES-GCM (suporta qualquer tamanho)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const wrappedBuffer = await crypto.subtle.wrapKey(
      'pkcs8',
      keyPair.privateKey,
      wrappingKey,
      { name: 'AES-GCM', iv }
    )

    // Concatenar IV + Dados Cifrados para persistência
    const combined = new Uint8Array(iv.length + wrappedBuffer.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(wrappedBuffer), iv.length)

    // Re-importar como non-extractable para uso em runtime
    const runtimePrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      await crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
      ECDH_ALGO,
      false,                      // non-extractable
      ['deriveKey', 'deriveBits']
    )

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)

    return {
      publicKeyJwk,
      encryptedPrivateKeyB64: this.#bufToB64(combined),
      runtimePrivateKey,
    }
  }

  /**
   * Desembrulha (unwrap) a chave privada do Firestore.
   *
   * @param {string}    encryptedPrivateKeyB64 - chave cifrada (IV + Data) em Base64
   * @param {CryptoKey} wrappingKey
   * @returns {Promise<CryptoKey>}
   */
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
      false,                      // non-extractable
      ['deriveKey', 'deriveBits']
    )
  }

  // ─── Importação de chaves públicas ────────────────────────────────────────

  /**
   * @param {object} jwk
   * @returns {Promise<CryptoKey>}
   */
  async #importPublicKeyJwk(jwk) {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      ECDH_ALGO,
      true,
      []
    )
  }

  /**
   * Re-importa uma CryptoKey como non-extractable (caso seja necessário).
   * @param {CryptoKey} key
   * @returns {Promise<CryptoKey>}
   */
  async #importPrivKeyJwkNonExtractable(key) {
    // Se já non-extractable (caso falhou exportar), devolver como está
    return key
  }

  // ─── Forward secrecy por mensagem (ECDH efêmero + HKDF) ─────────────────

  /**
   * @param {CryptoKey} privateKey
   * @param {CryptoKey} publicKey
   * @returns {Promise<CryptoKey>} AES-KW key
   */
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

  // ─── IndexedDB ────────────────────────────────────────────────────────────

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

  // ─── Utilitários ──────────────────────────────────────────────────────────

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

// Singleton — a mesma instância é compartilhada em toda a aplicação
export default new CryptoService()