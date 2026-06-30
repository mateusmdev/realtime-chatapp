import Firestore from '../../firebase/Firestore'
import {
  getFirestore, runTransaction, doc, onSnapshot,
  collection, getCountFromServer, query, where,
} from 'firebase/firestore'
import '../../firebase/firebaseConfig'

const COLLECTION = '_system'

// F6 — evita repetir 4 leituras de existência a cada login; esses
// documentos só mudam de estado de existência em deploys novos ou após
// limpeza manual do Firestore, então um cache curto é seguro.
const INIT_CHECK_CACHE_KEY = 'system-init-checked-at'
const INIT_CHECK_TTL_MS    = 60 * 60 * 1000 // 1 hora

const DOCS = Object.freeze({
  METADATA: 'metadata',
  SCHEDULE: 'schedule',
  LOCK:     'reset_lock',
  CRYPTO:   'crypto',
})

class SystemDocumentManager {
  #firestore = Firestore.instance
  #db        = getFirestore()

  async initializeIfNeeded() {
    if (this.#wasRecentlyChecked()) return

    const [metadataSnap, scheduleExists, lockExists, cryptoExists] = await Promise.all([
      this.#firestore.findById(COLLECTION, DOCS.METADATA),
      this.#documentExists(DOCS.SCHEDULE),
      this.#documentExists(DOCS.LOCK),
      this.#documentExists(DOCS.CRYPTO),
    ])

    const metadataExists = metadataSnap != null && metadataSnap.exists()
    const creates = []

    if (!metadataExists) {
      creates.push(
        this.#firestore.save(this.#buildInitialMetadata(), COLLECTION, DOCS.METADATA)
      )
    }

    if (!cryptoExists) {
      creates.push(
        this.#firestore.save(this.#buildInitialCrypto(), COLLECTION, DOCS.CRYPTO)
      )
    }

    if (!scheduleExists) {
      creates.push(
        this.#firestore.save(this.#buildInitialSchedule(), COLLECTION, DOCS.SCHEDULE)
      )
    }

    if (!lockExists) {
      creates.push(
        this.#firestore.save(this.#buildInitialLock(), COLLECTION, DOCS.LOCK)
      )
    }

    if (creates.length > 0) {
      await Promise.all(creates)
    }

    this.#markRecentlyChecked()
  }

  // F2 — exige o e-mail de quem está sendo contabilizado, para gravar,
  // na MESMA transação, a marcação countedInMetadata no doc do usuário.
  // Sem essa marcação a regra do Firestore rejeita o incremento (ver
  // justClaimedMetadataCredit() em firestore.rules).
  async incrementUserCount(email) {
    const metadataRef = doc(this.#db, COLLECTION, DOCS.METADATA)
    const userRef      = doc(this.#db, 'user', email)

    const newCount = await runTransaction(this.#db, async (transaction) => {
      const snap        = await transaction.get(metadataRef)
      const currentData = snap.exists() ? snap.data() : this.#buildInitialMetadata()
      const updated     = (currentData.user_count ?? 0) + 1

      transaction.set(metadataRef, {
        user_count:  updated,
        reset_count: currentData.reset_count ?? 0,
        created_at:  currentData.created_at  ?? Date.now(),
        max_users:   currentData.max_users   ?? this.#getConfiguredMaxUsers(),
      })

      transaction.set(userRef, { countedInMetadata: true }, { merge: true })

      return updated
    })

    return newCount
  }

  async decrementUserCount() {
    const metadataRef = doc(this.#db, COLLECTION, DOCS.METADATA)

    await runTransaction(this.#db, async (transaction) => {
      const snap        = await transaction.get(metadataRef)
      const currentData = snap.exists() ? snap.data() : this.#buildInitialMetadata()
      const updated     = Math.max(0, (currentData.user_count ?? 0) - 1)

      transaction.set(metadataRef, {
        user_count:  updated,
        reset_count: currentData.reset_count ?? 0,
        created_at:  currentData.created_at  ?? Date.now(),
        max_users:   currentData.max_users   ?? this.#getConfiguredMaxUsers(),
      })
    })
  }

  // F2 — não confia mais no campo armazenado (livremente incrementável
  // antes desta correção); conta usuários ativos ao vivo. count() é
  // cobrado como leitura normal (1 leitura por até 1000 entradas de
  // índice) e está disponível no plano Spark.
  async getUserCount() {
    try {
      const usersRef = collection(this.#db, 'user')

      const [totalSnap, deletedSnap] = await Promise.all([
        getCountFromServer(usersRef),
        getCountFromServer(query(usersRef, where('isDeleted', '==', true))),
      ])

      return Math.max(0, totalSnap.data().count - deletedSnap.data().count)
    } catch (error) {
      console.error('[SystemDocumentManager] Falha ao contar usuários via agregação; usando contador armazenado como fallback.', error)
      const data = await this.#getDocument(DOCS.METADATA)
      return data?.user_count ?? 0
    }
  }

  async getSchedule() {
    const data = await this.#getDocument(DOCS.SCHEDULE)
    return {
      next_reset_at: data?.next_reset_at ?? null,
    }
  }

  async getCryptoDynamicSalt() {
    const data = await this.#getDocument(DOCS.CRYPTO)
    const salt = data?.cryptoDynamicSalt

    if (!salt || typeof salt !== 'string' || salt.trim().length === 0) {
      const newSalt = this.#generateDynamicSalt()

      await this.#firestore.save(
        { cryptoDynamicSalt: newSalt },
        COLLECTION,
        DOCS.CRYPTO
      )

      return newSalt
    }

    return salt
  }

  async scheduleNextReset(triggeredAt, intervalMs) {
    const next_reset_at = triggeredAt + intervalMs

    await this.#firestore.save(
      { next_reset_at },
      COLLECTION,
      DOCS.SCHEDULE,
      { merge: true }
    )
  }

  async reinitialize() {
    const currentMeta    = await this.#getDocument(DOCS.METADATA)
    const nextResetCount = (currentMeta?.reset_count ?? 0) + 1
    const newDynamicSalt = this.#generateDynamicSalt()

    await Promise.all([
      this.#firestore.save(
        {
          ...this.#buildInitialMetadata(),
          reset_count: nextResetCount,
        },
        COLLECTION,
        DOCS.METADATA
      ),
      this.#firestore.save(
        { cryptoDynamicSalt: newDynamicSalt },
        COLLECTION,
        DOCS.CRYPTO
      ),
    ])
    await this.#firestore.save(this.#buildInitialLock(), COLLECTION, DOCS.LOCK)
  }

  listenResetCount(callback) {
    const metaRef = doc(this.#db, COLLECTION, DOCS.METADATA)

    return onSnapshot(
      metaRef,
      (snap) => {
        if (!snap.exists()) return
        const { reset_count } = snap.data()
        callback(reset_count ?? 0)
      },
      () => {}
    )
  }

  async #documentExists(docId) {
    const snap = await this.#firestore.findById(COLLECTION, docId)
    return snap != null && snap.exists()
  }

  async #getDocument(docId) {
    const snap = await this.#firestore.findById(COLLECTION, docId)
    if (snap != null && snap.exists()) return snap.data()
    return null
  }

  #generateDynamicSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  #buildInitialMetadata() {
    return {
      user_count:  0,
      reset_count: 0,
      created_at:  Date.now(),
      max_users:   this.#getConfiguredMaxUsers(),
    }
  }

  // F2 — lido a cada (re)inicialização do metadata, permitindo que você
  // reduza VITE_MAX_USERS após o pico inicial; o novo valor passa a valer
  // a partir do próximo ciclo de reset real.
  #getConfiguredMaxUsers() {
    return Math.max(0, Math.floor(Number(import.meta.env.VITE_MAX_USERS) || 0))
  }

  #buildInitialCrypto() {
    return {
      cryptoDynamicSalt: this.#generateDynamicSalt(),
    }
  }

  #buildInitialSchedule() {
    const hours      = Math.floor(Number(import.meta.env.VITE_RESET_INTERVAL_HOURS)   || 0)
    const minutes    = Math.floor(Number(import.meta.env.VITE_RESET_INTERVAL_MINUTES) || 0)
    const intervalMs = (hours * 3_600_000) + (minutes * 60_000)
    const next_reset_at = intervalMs > 0 ? Date.now() + intervalMs : null

    return { next_reset_at }
  }

  #buildInitialLock() {
    return {
      locked:         false,
      locked_at:      null,
      lock_holder_id: null,
    }
  }

  #wasRecentlyChecked() {
    const lastChecked = Number(localStorage.getItem(INIT_CHECK_CACHE_KEY) || 0)
    return (Date.now() - lastChecked) < INIT_CHECK_TTL_MS
  }

  #markRecentlyChecked() {
    localStorage.setItem(INIT_CHECK_CACHE_KEY, String(Date.now()))
  }
}

export default new SystemDocumentManager()