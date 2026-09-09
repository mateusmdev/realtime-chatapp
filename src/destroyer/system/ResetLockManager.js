import Firestore from '../../firebase/Firestore'
import { getFirestore, runTransaction, doc, serverTimestamp } from 'firebase/firestore'
import '../../firebase/firebaseConfig'

const COLLECTION      = '_system'
const DOC_LOCK        = 'reset_lock'
const LOCK_TIMEOUT_MS = 300_000

class ResetLockManager {
  #firestore = Firestore.instance
  #db        = getFirestore()

  async acquireLock(holderId, email) {
    const lockRef  = doc(this.#db, COLLECTION, DOC_LOCK)
    const actorRef = email ? doc(this.#db, 'reset_actor', email.toLowerCase()) : null

    const acquired = await runTransaction(this.#db, async (transaction) => {
      const snap = await transaction.get(lockRef)

      if (actorRef) {
        const actorSnap = await transaction.get(actorRef)

        if (!actorSnap.exists() || actorSnap.data()?.resetLockId !== holderId) {
          console.error('[ResetLockManager] Aborting acquireLock: holderId does not match the current reset_actor document (stale value from another tab/session, or reset_actor missing).')
          return false
        }
      }

      if (!snap.exists()) {
        transaction.set(lockRef, this.#buildAcquiredState(holderId))
        return true
      }

      const { locked, locked_at } = snap.data()
      const isStale = locked && this.#isLockStale(locked_at)

      if (!locked || isStale) {
        transaction.set(lockRef, this.#buildAcquiredState(holderId))
        return true
      }

      return false
    })

    return acquired
  }

  async releaseLock() {
    await this.#firestore.save(
      this.#buildReleasedState(),
      COLLECTION,
      DOC_LOCK
    )
  }

  async isLocked() {
    const snap = await this.#firestore.findById(COLLECTION, DOC_LOCK)

    if (snap == null || !snap.exists()) return false

    const { locked, locked_at } = snap.data()

    if (!locked)                      return false
    if (this.#isLockStale(locked_at)) return false

    return true
  }

  #isLockStale(lockedAt) {
    if (lockedAt == null) return true

    const millis = typeof lockedAt?.toMillis === 'function'
      ? lockedAt.toMillis()
      : lockedAt

    if (typeof millis !== 'number' || Number.isNaN(millis)) return true

    return Date.now() - millis > LOCK_TIMEOUT_MS
  }

  #buildAcquiredState(holderId) {
    return {
      locked:         true,
      locked_at:      serverTimestamp(),
      lock_holder_id: holderId,
    }
  }

  #buildReleasedState() {
    return {
      locked:         false,
      locked_at:      null,
      lock_holder_id: null,
    }
  }
}

export default new ResetLockManager()