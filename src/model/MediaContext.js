class MediaContext {
  strategy = null

  constructor(strategy) {
    this.strategy = strategy
  }
  
  execute() {
    return this.strategy.execute()
  }

  setStrate(strategy) {
    this.strategy = strategy
  }
}

export default MediaContext