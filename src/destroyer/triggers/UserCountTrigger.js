const MAX_USERS = Math.floor(Number(import.meta.env.VITE_MAX_USERS) || 0)

class UserCountTrigger {

  isEnabled() {
    return MAX_USERS > 0
  }

  evaluate(currentCount) {
    if (!this.isEnabled()) return false
    return currentCount >= MAX_USERS
  }
}

export default new UserCountTrigger()