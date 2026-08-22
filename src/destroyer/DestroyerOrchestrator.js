import SystemDocumentManager  from './system/SystemDocumentManager'
import ResetLockManager        from './system/ResetLockManager'
import FirestoreDestroyer      from './destroyers/FirestoreDestroyer'
import CloudinaryDestroyer     from './destroyers/CloudinaryDestroyer'
import AuthDestroyer           from './destroyers/AuthDestroyer'
import UserCountTrigger        from './triggers/UserCountTrigger'
import TimerTrigger            from './triggers/TimerTrigger'

class DestroyerOrchestrator {
  #systemManager       = SystemDocumentManager
  #lockManager         = ResetLockManager
  #firestoreDestroyer  = FirestoreDestroyer
  #cloudinaryDestroyer = CloudinaryDestroyer
  #authDestroyer       = AuthDestroyer

  async evaluateAndExecute(holderId) {
    try {
      const triggerType = await this.#shouldReset()
      if (triggerType === null) return

      if (!holderId) return

      const acquired = await this.#lockManager.acquireLock(holderId)

      if (!acquired) return

      await this.#executeReset(triggerType)

    } catch (error) {
      console.error('[DestroyerOrchestrator] Failed to evaluate/execute reset cycle:', error)
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

    const settledResults = await Promise.allSettled([
      this.#firestoreDestroyer.destroy(),
      this.#cloudinaryDestroyer.destroy(),
      this.#authDestroyer.destroy(),
    ])

    settledResults.forEach(result => {
      if (result.status === 'rejected') {
        console.error('[DestroyerOrchestrator] A destroyer step rejected unexpectedly:', result.reason)
      } else if (result.value?.status === 'FAILURE' || result.value?.status === 'PARTIAL_FAILURE') {
        console.error(`[DestroyerOrchestrator] Destroyer '${result.value.service}' finished with status ${result.value.status}:`, result.value.steps)
      }
    })

    try {
      await this.#systemManager.reinitialize()

      if (triggerType === 'timer') {
        await this.#systemManager.scheduleNextReset(triggeredAt, TimerTrigger.getIntervalMs())
      }
    } catch (error) {
      console.error('[DestroyerOrchestrator] Failed to reinitialize system after reset:', error)

      try {
        await this.#lockManager.releaseLock()
      } catch (releaseError) {
        console.error('[DestroyerOrchestrator] Failed to release reset lock after a failed reset — system may remain locked:', releaseError)
      }
    }
  }
}

export default new DestroyerOrchestrator()