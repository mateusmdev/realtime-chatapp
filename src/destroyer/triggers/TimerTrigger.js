const INTERVAL_HOURS = Number(import.meta.env.VITE_RESET_INTERVAL_HOURS) || 0

class TimerTrigger {
  
  isEnabled() {
    return Number.isFinite(INTERVAL_HOURS) && INTERVAL_HOURS > 0
  }

  evaluate(nextResetAt) {
    if (!this.isEnabled())      return false
    if (nextResetAt == null)    return false
    return Date.now() >= nextResetAt
  }
}

export default new TimerTrigger()