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

    // `email` (the current lock holder) is deliberately excluded from the reset_actor wipe
    // below. The Firestore rule guarding `_system/crypto` re-validates isLockHolder() at write
    // time, which reads this exact document — deleting it here, before reinitialize() runs,
    // used to make that write fail with "Missing or insufficient permissions" on every single
    // reset cycle (see diagnostic report, Erro 1). It's cleaned up explicitly at the end of this
    // method instead, once it's no longer needed for authorization.
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

      // The lock holder's reset_actor document is intentionally left alone here: a
      // partial/failed destroy pass means the system's state isn't fully known, so we avoid
      // deleting more of it. ensureResetLockId() self-heals it on this user's next login, and a
      // future successful reset cycle will sweep it up normally.
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

    // Reschedule regardless of reinitialize()'s outcome above: `triggeredAt` was captured
    // before any destructive work started, so it doesn't depend on reinitialize() having
    // succeeded. This specifically prevents a failed/partial reinitialize() from leaving
    // `_system/schedule.next_reset_at` stuck in the past, which would otherwise make every
    // subsequent login re-trigger a brand new full reset cycle indefinitely.
    if (triggerType === 'timer') {
      try {
        await this.#systemManager.scheduleNextReset(triggeredAt, TimerTrigger.getIntervalMs())
      } catch (scheduleError) {
        console.error('[DestroyerOrchestrator] Failed to schedule next reset:', scheduleError)
      }
    }

    // Finally, remove the reset_actor document that was preserved above so the collection ends
    // up empty either way, matching the pre-fix end state. This only requires the caller to own
    // the document (see firestore.rules: `allow delete: if isOwner(email) || ...`), so it's safe
    // here regardless of whether reinitialize() above succeeded or the lock's current state.
    try {
      await this.#actorRegistry.delete(email)
    } catch (cleanupError) {
      console.error('[DestroyerOrchestrator] Failed to clean up lock holder reset_actor after reset:', cleanupError)
    }
  }
}

export default new DestroyerOrchestrator()