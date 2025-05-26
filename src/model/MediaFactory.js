import ContactSender from './ContactSender'
import DocumentHandler from './DocumentHandler'
import RenderImage from './RenderImage'

class MediaFactory {

  static getInstance(mediaId) {
    const dictionary = {
      'take-screenshot-btn': null,
      'send-picture-btn': null,
      'send-document-btn': DocumentHandler,
      'send-contact-btn': null,
    }
    
    const selectedMedia = dictionary[mediaId]
    
    const instance = new selectedMedia()
    return instance
  }
}

export default MediaFactory