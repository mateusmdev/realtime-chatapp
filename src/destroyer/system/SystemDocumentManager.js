import Firestore from '../../firebase/Firestore'
import { getFirestore, runTransaction, doc } from 'firebase/firestore'
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
      next_reset_at:  data?.next_reset_at  ?? null,
      interval_hours: data?.interval_hours ?? 0,
    }
  }

  async scheduleNextReset(intervalHours) {
    const next_reset_at = Date.now() + intervalHours * 3_600_000

    await this.#firestore.save(
      { next_reset_at, interval_hours: intervalHours },
      COLLECTION,
      DOCS.SCHEDULE
    )
  }

  async reinitialize() {
    await Promise.all([
      this.#firestore.save(this.#buildInitialMetadata(), COLLECTION, DOCS.METADATA),
      this.#firestore.save(this.#buildInitialSchedule(), COLLECTION, DOCS.SCHEDULE),
      this.#firestore.save(this.#buildInitialLock(),    COLLECTION, DOCS.LOCK),
    ])
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
      user_count: 0,
      created_at: Date.now(),
    }
  }

  #buildInitialSchedule() {
    const intervalHours = Number(import.meta.env.VITE_RESET_INTERVAL_HOURS) || 0
    const next_reset_at = intervalHours > 0
      ? Date.now() + intervalHours * 3_600_000
      : null

    return {
      next_reset_at,
      interval_hours: intervalHours,
    }
  }

  #buildInitialLock() {
    return {
      locked:          false,
      locked_at:       null,
      lock_holder_id:  null,
    }
  }
}

export default new SystemDocumentManager()