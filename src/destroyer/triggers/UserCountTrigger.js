const MAX_USERS = Number(import.meta.env.VITE_MAX_USERS) || 0

class UserCountTrigger {

  isEnabled() {
    return Number.isInteger(MAX_USERS) && MAX_USERS > 0
  }

  evaluate(currentCount) {
    if (!this.isEnabled()) return false
    return currentCount >= MAX_USERS
  }
}

export default new UserCountTrigger()