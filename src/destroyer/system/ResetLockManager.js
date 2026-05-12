import Firestore from '../../firebase/Firestore'
import { getFirestore, runTransaction, doc } from 'firebase/firestore'
import '../../firebase/firebaseConfig'

const COLLECTION = '_system'
const DOC_LOCK   = 'reset_lock'
const LOCK_TIMEOUT_MS = 120_000

class ResetLockManager {
  #firestore = Firestore.instance
  #db        = getFirestore()

  async acquireLock(holderId) {
    const lockRef = doc(this.#db, COLLECTION, DOC_LOCK)

    const acquired = await runTransaction(this.#db, async (transaction) => {
      const snap = await transaction.get(lockRef)

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

    if (!locked) return false
    if (this.#isLockStale(locked_at)) return false

    return true
  }

  #isLockStale(lockedAt) {
    if (lockedAt == null) return true
    return Date.now() - lockedAt > LOCK_TIMEOUT_MS
  }

  #buildAcquiredState(holderId) {
    return {
      locked:          true,
      locked_at:       Date.now(),
      lock_holder_id:  holderId,
    }
  }

  #buildReleasedState() {
    return {
      locked:          false,
      locked_at:       null,
      lock_holder_id:  null,
    }
  }
}

export default new ResetLockManager()