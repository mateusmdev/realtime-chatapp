class CloudinaryDestroyer {

  async destroy() {
    const startedAt = Date.now()

    return this.#buildSkippedReport('media_blocked_in_production', startedAt)
  }

  #buildSkippedReport(reason, startedAt) {
    return {
      service:     'cloudinary',
      status:      'SKIPPED',
      steps:       [{ name: reason, status: 'SKIPPED', count: 0, error: null }],
      duration_ms: Date.now() - startedAt,
    }
  }
}

export default new CloudinaryDestroyer()