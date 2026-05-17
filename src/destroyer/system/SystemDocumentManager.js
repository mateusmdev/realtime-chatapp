import Firestore from '../../firebase/Firestore'
import { getFirestore, runTransaction, doc, onSnapshot } from 'firebase/firestore'
import '../../firebase/firebaseConfig'

const COLLECTION = '_system'

const DOCS = Object.freeze({
  METADATA: 'metadata',
  SCHEDULE: 'schedule',
  LOCK:     'reset_lock',
})

class SystemDocumentManager {
  #firestore = Firestore.instance
  #db        = getFirestore()

  async initializeIfNeeded() {
    const [metadataExists, scheduleExists, lockExists] = await Promise.all([
      this.#documentExists(DOCS.METADATA),
      this.#documentExists(DOCS.SCHEDULE),
      this.#documentExists(DOCS.LOCK),
    ])

    const creates = []

    if (!metadataExists) {
      creates.push(
        this.#firestore.save(this.#buildInitialMetadata(), COLLECTION, DOCS.METADATA)
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
  }

  async incrementUserCount() {
    const metadataRef = doc(this.#db, COLLECTION, DOCS.METADATA)

    const newCount = await runTransaction(this.#db, async (transaction) => {
      const snap        = await transaction.get(metadataRef)
      const currentData = snap.exists() ? snap.data() : this.#buildInitialMetadata()
      const updated     = (currentData.user_count ?? 0) + 1

      transaction.set(metadataRef, { ...currentData, user_count: updated })
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

      transaction.set(metadataRef, { ...currentData, user_count: updated })
    })
  }

  async getUserCount() {
    const data = await this.#getDocument(DOCS.METADATA)
    return data?.user_count ?? 0
  }

  async getSchedule() {
    const data = await this.#getDocument(DOCS.SCHEDULE)
    return {
      next_reset_at: data?.next_reset_at ?? null,
    }
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

    await Promise.all([
      this.#firestore.save(
        { ...this.#buildInitialMetadata(), reset_count: nextResetCount },
        COLLECTION,
        DOCS.METADATA
      ),
      this.#firestore.save(this.#buildInitialLock(), COLLECTION, DOCS.LOCK),
    ])
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

  #buildInitialMetadata() {
    return {
      user_count:  0,
      reset_count: 0,
      created_at:  Date.now(),
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
}

export default new SystemDocumentManager()