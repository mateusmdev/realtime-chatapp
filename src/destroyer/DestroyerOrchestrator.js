import SystemDocumentManager  from './system/SystemDocumentManager'
import ResetLockManager        from './system/ResetLockManager'
import FirestoreDestroyer      from './destroyers/FirestoreDestroyer'
import CloudinaryDestroyer     from './destroyers/CloudinaryDestroyer'
import AuthDestroyer           from './destroyers/AuthDestroyer'
import UserCountTrigger        from './triggers/UserCountTrigger'
import TimerTrigger            from './triggers/TimerTrigger'
import LocalStorage            from '../utils/LocalStorage'

class DestroyerOrchestrator {
  #systemManager       = SystemDocumentManager
  #lockManager         = ResetLockManager
  #firestoreDestroyer  = FirestoreDestroyer
  #cloudinaryDestroyer = CloudinaryDestroyer
  #authDestroyer       = AuthDestroyer

  async evaluateAndExecute() {
    try {
      const triggerType = await this.#shouldReset()
      if (triggerType === null) return

      // F1 — a regra de _system/reset_lock agora exige que lock_holder_id
      // seja exatamente request.auth.uid (não mais um UUID arbitrário),
      // para que toda ativação do lock fique ligada a uma conta real.
      const holderId = LocalStorage.getFirebaseUid()
      if (!holderId) return

      const acquired = await this.#lockManager.acquireLock(holderId)

      if (!acquired) return

      await this.#executeReset(triggerType)

    } catch (_) {

    }
  }

  async #shouldReset() {
    const [userCount, schedule] = await Promise.all([
      this.#systemManager.getUserCount(),
      this.#systemManager.getSchedule(),
    ])

    if (TimerTrigger.isEnabled() && TimerTrigger.evaluate(schedule.next_reset_at)) {
      return 'timer'
    }

    if (UserCountTrigger.isEnabled() && UserCountTrigger.evaluate(userCount)) {
      return 'userCount'
    }

    return null
  }

  async #executeReset(triggerType) {
    const triggeredAt = Date.now()

    await Promise.allSettled([
      this.#firestoreDestroyer.destroy(),
      this.#cloudinaryDestroyer.destroy(),
      this.#authDestroyer.destroy(),
    ])

    try {
      await this.#systemManager.reinitialize()

      if (triggerType === 'timer') {
        await this.#systemManager.scheduleNextReset(triggeredAt, TimerTrigger.getIntervalMs())
      }
    } catch (_) {
      try {
        await this.#lockManager.releaseLock()
      } catch (_) {
      }
    }
  }
}

export default new DestroyerOrchestrator()