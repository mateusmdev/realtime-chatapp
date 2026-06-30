const BLOCK_MEDIA = import.meta.env.VITE_BLOCK_MEDIA === 'true'

class MediaPolicy {

  static isUploadAllowed() {
    return !BLOCK_MEDIA
  }

  static assertUploadAllowed() {
    if (BLOCK_MEDIA) {
      throw new Error('UPLOAD_BLOCKED: Media upload is disabled in this environment.')
    }
  }
}

export default MediaPolicy