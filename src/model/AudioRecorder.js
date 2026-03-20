class AudioRecorder {
  #mediaRecorder = null
  #chunks = []
  #stream = null

  static #instance = null

  static getInstance() {
    if (AudioRecorder.#instance === null) {
      AudioRecorder.#instance = new AudioRecorder()
    }

    return AudioRecorder.#instance
  }

  isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)
  }

  async start() {
    this.#chunks = []
    this.#stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.#mediaRecorder = new MediaRecorder(this.#stream)

    this.#mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.#chunks.push(e.data)
      }
    }

    this.#mediaRecorder.start()
  }

  stop() {
    return new Promise((resolve) => {
      this.#mediaRecorder.onstop = () => {
        const mimeType = this.#mediaRecorder.mimeType
        const blob = new Blob(this.#chunks, { type: mimeType })
        this.#chunks = []
        this.#stopStream()
        resolve(blob)
      }

      this.#mediaRecorder.stop()
    })
  }

  cancel() {
    if (this.#mediaRecorder && this.#mediaRecorder.state !== 'inactive') {
      this.#mediaRecorder.onstop = null
      this.#mediaRecorder.stop()
    }

    this.#chunks = []
    this.#stopStream()
  }

  #stopStream() {
    if (this.#stream) {
      this.#stream.getTracks().forEach(track => track.stop())
      this.#stream = null
    }

    this.#mediaRecorder = null
  }
}

export default AudioRecorder