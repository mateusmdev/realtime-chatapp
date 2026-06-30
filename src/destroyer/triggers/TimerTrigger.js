const INTERVAL_HOURS   = Math.max(0, Math.floor(Number(import.meta.env.VITE_RESET_INTERVAL_HOURS)   || 0))
const INTERVAL_MINUTES = Math.max(0, Math.floor(Number(import.meta.env.VITE_RESET_INTERVAL_MINUTES) || 0))
const INTERVAL_MS      = (INTERVAL_HOURS * 3_600_000) + (INTERVAL_MINUTES * 60_000)

class TimerTrigger {

  isEnabled() {
    return INTERVAL_MS > 0
  }

  evaluate(nextResetAt) {
    if (!this.isEnabled())   return false
    if (nextResetAt == null) return false
    return Date.now() >= nextResetAt
  }

  getIntervalMs() {
    return INTERVAL_MS
  }
}

export default new TimerTrigger()