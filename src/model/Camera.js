class Camera {

  #stream = null
  static #instance = null

  static getInstance(mediaId) {
    if (Camera.#instance === null) {
        Camera.#instance = new Camera()
    }

    return Camera.#instance
  }

  isSupported() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false 
    }

    return true
  }
  
  async getStream() {
    this.#stream = await navigator.mediaDevices.getUserMedia({ video: true })
    return this.#stream
  }

  takePhoto(settings) {
    const { renderArea, origin, width, height, mimeType } = settings
    
    renderArea.setAttribute('width', width)
    renderArea.setAttribute('height', height)

    const context = renderArea.getContext('2d') 
    context.drawImage(origin, 0, 0, renderArea.width, renderArea.height)

    return renderArea.toDataURL(mimeType)
  }

  stop() {
    if (this.#stream !== null) {
      this.#stream.getTracks().forEach(track => {
        track.stop()
      })

      this.#stream = null
    }
  }
}

export default Camera