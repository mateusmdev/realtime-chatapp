import DocumentHandler from './DocumentHandler'
import RenderImage from './RenderImage'

class MediaFactory {

  static getInstance(mediaId) {
    const dictionary = {
      'send-picture-btn': RenderImage,
      'send-document-btn': DocumentHandler,
    }
    
    const selectedMedia = dictionary[mediaId] || null
    let instance = null

    if (selectedMedia != null) {
      instance = new selectedMedia()
    }
    
    return instance
  }
}

export default MediaFactory