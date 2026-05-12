import SystemDocumentManager  from './system/SystemDocumentManager'
import ResetLockManager        from './system/ResetLockManager'
import FirestoreDestroyer      from './destroyers/FirestoreDestroyer'
import CloudinaryDestroyer     from './destroyers/CloudinaryDestroyer'
import AuthDestroyer           from './destroyers/AuthDestroyer'
import UserCountTrigger        from './triggers/UserCountTrigger'
import TimerTrigger            from './triggers/TimerTrigger'

class DestroyerOrchestrator {
  #systemManager      = SystemDocumentManager
  #lockManager        = ResetLockManager
  #firestoreDestroyer = FirestoreDestroyer
  #cloudinaryDestroyer = CloudinaryDestroyer
  #authDestroyer      = AuthDestroyer

  async evaluateAndExecute() {
    try {
      const shouldReset = await this.#shouldReset()
      if (!shouldReset) return

      const holderId = crypto.randomUUID()
      const acquired = await this.#lockManager.acquireLock(holderId)

      if (!acquired) return

      await this.#executeReset()

    } catch (_) {

    }
  }

  async #shouldReset() {
    const [userCount, schedule] = await Promise.all([
      this.#systemManager.getUserCount(),
      this.#systemManager.getSchedule(),
    ])

    const byUserCount = UserCountTrigger.isEnabled()
                     && UserCountTrigger.evaluate(userCount)

    const byTimer     = TimerTrigger.isEnabled()
                     && TimerTrigger.evaluate(schedule.next_reset_at)

    return byUserCount || byTimer
  }

  async #executeReset() {
    await Promise.allSettled([
      this.#firestoreDestroyer.destroy(),
      this.#cloudinaryDestroyer.destroy(),
      this.#authDestroyer.destroy(),
    ])

    try {
      await this.#systemManager.reinitialize()
    } catch (_) {
      try {
        await this.#lockManager.releaseLock()
      } catch (_) {
      }
    }
  }
}

export default new DestroyerOrchestrator()