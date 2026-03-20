class AudioPlayer {
  #context = null
  #buffer = null
  #source = null
  #startTime = 0
  #offset = 0
  #intervalId = null
  #playing = false

  async load(url) {
    this.#context = new AudioContext()

    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    this.#buffer = await this.#context.decodeAudioData(arrayBuffer)
  }

  play(onTimeUpdate, onEnded) {
    if (!this.#buffer || this.#playing) return

    this.#source = this.#context.createBufferSource()
    this.#source.buffer = this.#buffer
    this.#source.connect(this.#context.destination)

    this.#source.onended = () => {
      if (!this.#playing) return

      this.#playing = false
      this.#offset = 0
      this.#clearInterval()

      if (onEnded) onEnded()
    }

    this.#startTime = this.#context.currentTime
    this.#source.start(0, this.#offset)
    this.#playing = true

    this.#intervalId = setInterval(() => {
      if (onTimeUpdate) onTimeUpdate(this.currentTime, this.duration)
    }, 100)
  }

  pause() {
    if (!this.#playing) return

    this.#source.onended = null
    this.#source.stop()
    this.#source = null

    this.#offset = this.currentTime
    this.#playing = false
    this.#clearInterval()
  }

  seek(ratio) {
    const wasPlaying = this.#playing

    if (wasPlaying) {
      this.#source.onended = null
      this.#source.stop()
      this.#source = null
      this.#playing = false
      this.#clearInterval()
    }

    this.#offset = ratio * this.duration

    if (wasPlaying) {
      this.play(null, null)
    }
  }

  destroy() {
    this.#clearInterval()

    if (this.#source) {
      this.#source.onended = null
      try { this.#source.stop() } catch (_) {}
      this.#source = null
    }

    if (this.#context) {
      this.#context.close()
      this.#context = null
    }

    this.#buffer = null
    this.#playing = false
    this.#offset = 0
  }

  get duration() {
    return this.#buffer?.duration ?? 0
  }

  get currentTime() {
    if (!this.#playing) return this.#offset
    return this.#offset + (this.#context.currentTime - this.#startTime)
  }

  get isPlaying() {
    return this.#playing
  }

  #clearInterval() {
    if (this.#intervalId) {
      clearInterval(this.#intervalId)
      this.#intervalId = null
    }
  }
}

export default AudioPlayer