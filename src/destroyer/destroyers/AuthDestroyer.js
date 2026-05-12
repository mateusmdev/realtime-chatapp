class AuthDestroyer {

  async destroy() {
    const startedAt = Date.now()

    return this.#buildSoftResetReport(startedAt)
  }

  #buildSoftResetReport(startedAt) {
    return {
      service:     'auth',
      status:      'SOFT_RESET',
      steps: [{
        name:   'firebase_auth_users',
        status: 'SKIPPED',
        count:  0,
        error:  null,
      }],
      duration_ms: Date.now() - startedAt,
    }
  }
}

export default new AuthDestroyer()