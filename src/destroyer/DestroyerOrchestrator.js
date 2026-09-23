import SystemDocumentManager  from './system/SystemDocumentManager'
import ResetLockManager        from './system/ResetLockManager'
import ResetActorRegistry      from './system/ResetActorRegistry'
import FirestoreDestroyer      from './destroyers/FirestoreDestroyer'
import CloudinaryDestroyer     from './destroyers/CloudinaryDestroyer'
import AuthDestroyer           from './destroyers/AuthDestroyer'
import UserCountTrigger        from './triggers/UserCountTrigger'
import TimerTrigger            from './triggers/TimerTrigger'

class DestroyerOrchestrator {
  #systemManager       = SystemDocumentManager
  #lockManager         = ResetLockManager
  #actorRegistry       = ResetActorRegistry
  #firestoreDestroyer  = FirestoreDestroyer
  #cloudinaryDestroyer = CloudinaryDestroyer
  #authDestroyer       = AuthDestroyer

  async evaluateAndExecute(holderId, email) {
    try {
      const triggerType = await this.#shouldReset()
      if (triggerType === null) return

      if (!holderId) return

      const acquired = await this.#lockManager.acquireLock(holderId, email)

      if (!acquired) return

      await this.#executeReset(triggerType, email)

    } catch (error) {
      console.error('[DestroyerOrchestrator] Failed to evaluate/execute reset cycle:', error, '| client clock (ms):', Date.now())
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

  async #executeReset(triggerType, email) {
    const triggeredAt = Date.now()

    const settledResults = await Promise.allSettled([
      this.#firestoreDestroyer.destroy(email),
      this.#cloudinaryDestroyer.destroy(),
      this.#authDestroyer.destroy(),
    ])

    let hasFailure = false

    settledResults.forEach(result => {
      if (result.status === 'rejected') {
        console.error('[DestroyerOrchestrator] A destroyer step rejected unexpectedly:', result.reason)
        hasFailure = true
      } else if (result.value?.status === 'FAILURE' || result.value?.status === 'PARTIAL_FAILURE') {
        console.error(`[DestroyerOrchestrator] Destroyer '${result.value.service}' finished with status ${result.value.status}:`, result.value.steps)
        hasFailure = true
      }
    })
    if (hasFailure) {
      console.error(
        '[DestroyerOrchestrator] One or more destroyers did not complete successfully — ' +
        'skipping reinitialize() so the system is not marked as freshly reset while stale ' +
        'data may still remain. Releasing the lock so a future cycle can retry.'
      )

      try {
        await this.#lockManager.releaseLock()
      } catch (releaseError) {
        console.error('[DestroyerOrchestrator] Failed to release reset lock after a partial/failed reset — system may remain locked:', releaseError)
      }

      return
    }

    try {
      await this.#systemManager.reinitialize()
    } catch (error) {
      console.error('[DestroyerOrchestrator] Failed to reinitialize system after reset:', error)

      try {
        await this.#lockManager.releaseLock()
      } catch (releaseError) {
        console.error('[DestroyerOrchestrator] Failed to release reset lock after a failed reset — system may remain locked:', releaseError)
      }
    }

    if (triggerType === 'timer') {
      try {
        await this.#systemManager.scheduleNextReset(triggeredAt, TimerTrigger.getIntervalMs())
      } catch (scheduleError) {
        console.error('[DestroyerOrchestrator] Failed to schedule next reset:', scheduleError)
      }
    }

    try {
      await this.#actorRegistry.delete(email)
    } catch (cleanupError) {
      console.error('[DestroyerOrchestrator] Failed to clean up lock holder reset_actor after reset:', cleanupError)
    }
  }
}

export default new DestroyerOrchestrator()