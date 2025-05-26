class MediaContext {
  strategy = null

  constructor(strategy) {
    this.strategy = strategy
  }
  
  execute(data) {
    return this.strategy.execute(data)
  }

  setStrate(strategy) {
    this.strategy = strategy
  }
}

export default MediaContext