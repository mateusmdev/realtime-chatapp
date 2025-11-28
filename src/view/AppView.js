import AbstractView from './AbstractView'
import './../sass/app.scss'

class AppView extends AbstractView {
  
  constructor(){
    super()
  }

  _initState() {
    return {
      blockMedia: false,
      isIconListBlock: true,
      isEmojiModalOpen: false,
      isMediaBarOpen: false,
      placeholderText: 'Digite sua mensagem',
      range: null,
      mediaButtonId: null,
      appStyle: 'circle',
      isVideoRecording: false,
      isPhotoAreaVisible: false,
      isMediaModalOpen: false,
    }
  }

  loadUserContent(data){
    if (!data) return

    const profilePictures = document.querySelectorAll('.profile-picture.user-picture')
    const { userNameContent, userAboutContent, userEmailContent } = this.$()

    document.title = data.name;
    [...profilePictures].forEach(picture => {
      picture.src = data.profilePicture ?? data.picture
    })

    userNameContent.innerText = data.name
    userAboutContent.innerText = data.about
    userEmailContent.innerText = data.email
  }

  loadContacts(list, options = {}) {
    const { contactContainer } = this.$()
    const baseItem = contactContainer.querySelector('.item')
    contactContainer.innerHTML = ''

    
    if (list?.length < 1) return
    
    list.forEach(dataItem => {
      const item = baseItem.cloneNode(true)
      
      const profile = item.querySelector('.picture-wrapper img')
      const name = item.querySelector('.name')
      const about = item.querySelector('.phrase-contact')
      
      profile.src = dataItem.profilePicture ?? dataItem.picture
      name.innerText = dataItem.name
      about.innerText = dataItem.about
      
      const callbackParam = {
        profileImage: dataItem.profilePicture ?? dataItem.picture,
        name: dataItem.name
      } 

      this.addEvent(item, {
        eventName: 'click',
        fn: event => options.handleCallback(event, callbackParam),
        behavior: {
          preventDefault: true
        }
      })

      contactContainer.appendChild(item)
    })
  }

  updateMessageScreen(data) {
    const { messageScreen } = this.$()
    const { profileImage, name } = data
    
    const userName = messageScreen.querySelector('.contact-data .name')
    const image = messageScreen.querySelector('.picture-wrapper img')

    userName.innerText = name
    image.src = profileImage
  }

  initLayout(preferences = {}) {
    const [blockMediaState, isIconListBlock] = this.getState('blockMedia', 'isIconListBlock')

    if (blockMediaState === true) {
      const { takePhotoBtn, sendPictureBtn, sendDocumentBtn } = this.$()

      const blockedElements = [takePhotoBtn, sendPictureBtn, sendDocumentBtn];
      
      blockedElements.forEach(element => {
        this.setStyle(element, {
          opacity: '0.3',
          cursor: 'not-allowed'
        })

        element.disabled = true
      })
    }

    if (isIconListBlock === true) {
      const { emojiModalBtn } = this.$()

      this.setStyle(emojiModalBtn, {
        visibility: 'hidden',
        opacity: '0',
        display: 'none'
      })

      emojiModalBtn.disabled = true
    }

    placeholder.innerText = this.getState('placeholderText')
    
    const { appStyle } = preferences
    const splashScreen = this.$('splashScreen')
    const appStyleState = this.getState('appStyle')

    this.setState('appStyle', appStyle ?? appStyleState)
    
    this.setAppStyle()
    splashScreen.remove()
  }

  closeConcorrentModal() {
    const event = new CustomEvent('closeModal', {
      bubbles: false,
      cancelable: true,
      composed: false
    })

    const { messageScreen } = this.$()
    messageScreen.dispatchEvent(event)
  }

  changeSection(button){
    const { messageSection, contactSection, settingSection } = this.$()
    const dictionary = {
      'chat-menu-btn': messageSection,
      'contact-menu-btn': contactSection,
      'setting-menu-btn': settingSection,
    }

    const selectedSection = dictionary[button.id] || null
    if (!selectedSection) return

    const activeSection = document.querySelector('.menu section.active')
    const activeMenuBtn = document.querySelector('.navigation-link.active')

    activeSection.classList.remove('active')
    activeMenuBtn.classList.remove('active')

    selectedSection.classList.add('active')
    button.classList.add('active')
  }

  toggleContentScreen(screenName, value){
    const messageScreen = document.querySelector('.message-screen')
    messageScreen.classList.toggle
  }
  
  toggleMessageScreen(open = true){
    const contentScreen = document.querySelector('main')
    const homeScreen = document.querySelector('main section.home')
    const messageScreen = document.querySelector('main section.message-screen')
    
    if (open === true) {
      messageScreen.classList.remove('hidden')
      homeScreen.classList.add('hidden')
      contentScreen.classList.add('messages')
      
      return
    }
    
    messageScreen.classList.add('hidden')
    homeScreen.classList.remove('hidden')
    contentScreen.classList.remove('messages')
  }

  toggleContactError(hasError = true) {
    const contactAdvise = this.$('contactAdvise')
      
    this.setStyle(contactAdvise, {
      display: hasError ? 'initial' : 'none',
      opacity: hasError ? '1' : '0'
    })
  }

  setAddContactModal(element){
    const { addContactBtn, addContactSection, contactInput } = this.$()

    if (element === addContactBtn){
      addContactSection.classList.add('overlay-active')
      return
    }
    
    contactInput.value = ''
    addContactSection.classList.remove('overlay-active')
    this.toggleContactError(false)
  }

  loadEmoji(data){

    if (!data || data?.length < 1) {
      this.setState('isIconListBlock', true)
      
      return
    }

    const { emojiList } = this.$()
    const emojiPromises = data.map(emoji => {
      return new Promise((resolve, reject) => {
        const li = this.createElement('li', emojiList, {
          'emoji-name': emoji.slug
        })

        li.textContent = emoji.character
        resolve()
      })
    })
    
    this.setState('isIconListBlock', false)
    Promise.all(emojiPromises)    
  }

  toggleEmojiModal(){
    if (this.getState('isIconListBlock') === true) {
      return
    }
    
    if (this.getState('isMediaBarOpen')  === true) {
      this.closeConcorrentModal()
    }
    
    const { emojiList } = this.$()
    const emojiContainer = emojiList.parentNode
    
    this.setState('isEmojiModalOpen', !this.getState('isEmojiModalOpen'))
    
    emojiContainer.style.marginBottom = this.getState('isEmojiModalOpen') ? 'initial' : '-12.5rem'
  }
  
  toggleMediaBar() {
    const isActionBlocked = !this.getState('isMediaBarOpen') && this.getState('isMediaModalOpen') 
    
    if (isActionBlocked) return
      
    if (this.getState('isEmojiModalOpen') === true) {
      this.closeConcorrentModal()
    }
      
    const mediaBar = document.querySelector('.media-bar')
    const state = this.getState('isMediaBarOpen')
    const toggleMethod = state ? mediaBar.classList.remove : mediaBar.classList.add
    
    toggleMethod.call(mediaBar.classList, 'show-media-bar')
    this.setState('isMediaBarOpen', !state)
  }
  
  toggleMediaModal(mediaType = '') {
    const { media } = this.$()
    const modals = [...media.querySelectorAll('.media-type')]
    const modalState = this.getState('isMediaModalOpen')

    this.setState('isMediaModalOpen', !modalState)
    
    if (!modalState === true) {
      const selectedModal = modals.find(currentModal => {
        const classes = [...currentModal.classList]
        return classes.includes(mediaType)
      })

      if (selectedModal) {
        selectedModal.style.display = 'flex'
        media.classList.add('overlay-active')
      }
      
      return
    }
    
    media.classList.remove('overlay-active')
    modals.forEach(currentModal => currentModal.style.display = 'none')
  }

  async setDefaultMode(event) {
    const { inputContent, placeholder } = this.$()

    const IsIgnoredElements = event.target === inputContent || event.target === placeholder

    if (IsIgnoredElements === true) return

    const classList =['icon-container', 'media-bar']

    const result = classList.some(item => {
      const contain = event.target.classList.contains(item)

      return contain
    })

    if (result === true) return;
  
    if (this.getState('isMediaBarOpen') === true) {
      this.toggleMediaBar()
      return
    }

    if (this.getState('isEmojiModalOpen') === true) {
      this.toggleEmojiModal()
      return
    }
  }

  async setUserContent(event) {
    if (event.type === 'keypress' && event.key === 'Enter') {
      event.preventDefault()
      event.target.blur()

      return
    }

    if (event.type === 'blur') {

      const target = event.target
      const fieldName = target.id.split('-')[1]

      const customEvent = new CustomEvent('saveData', {
        bubbles: false,
        cancelable: true,
        composed: false,
        detail: {
          changes: {
            name: target.id === 'user-name-content',
            about: target.id === 'user-about-content',
          },
          value: target.innerText,
          fieldName: fieldName,

        }
      })

      target.dispatchEvent(customEvent)
    }
  }

  async toggleMessagePlaceholder(event) {
    const { inputContent, placeholder, microphoneBtn, sendBtn } = this.$()
    const message = inputContent.innerText.trim()

    if (message.length < 1) {
      placeholder.innerText = this.getState('placeholderText')
      microphoneBtn.classList.remove('hidden')
      sendBtn.classList.add('hidden')
    } else {
      placeholder.innerText = ''
      microphoneBtn.classList.add('hidden')
      sendBtn.classList.remove('hidden')   
    }
  }

  async addEmoji(event) {
    if (event.target !== event.currentTarget) {
      const { inputContent } = this.$()
      const emoji = event.target
      const textNode = document.createTextNode(emoji.innerText)

      if (!this.getState('range')) {
          inputContent.focus();
          return;
      }

      const selection = window.getSelection()
      selection.removeAllRanges();
      selection.addRange(this.getState('range'))

      const range = selection.getRangeAt(0)
      range.deleteContents()

      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)

      this.setState('range', range.cloneRange())
    }
  }

  async setSelection(event) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        this.setState('range', selection.getRangeAt(0).cloneRange())
    }
  }

  setAppStyle() {
    const { btnContainer } = this.$()
    const profilePicure = document.querySelectorAll('.profile-picture')
    const button = document.querySelector('.custom-toggle-button')
    const appStyleState = this.getState('appStyle')

    button.style.marginLeft = appStyleState === 'circle' ? '-63%' : '63%';

    [...profilePicure].forEach(item => {
      const radius = appStyleState === 'circle' ? '50%' : '5px'
      item.style.borderRadius = radius
    })

    if (appStyleState === 'circle') {
      btnContainer.classList.remove('square-position')
    } else {
      btnContainer.classList.add('square-position')
    } 
  }

  togglePhotoArea() {
    const { photoArea, videoArea } = this.$()
    const state = this.getState('isPhotoAreaVisible')
    
    videoArea.style.zIndex = state === false ? '1' : 'initial'
    photoArea.style.zIndex = state === true ? '1' : 'initial'
  }
  
  togglePhotoAction() {
    const { takePhotoActionBtn, sendPhotoActionBtn, repeatTakePhoto } = this.$()
    const state = this.getState('isPhotoAreaVisible')

    takePhotoActionBtn.style.visibility = state === true ? 'hidden' : 'initial'
    sendPhotoActionBtn.style.display = state === false ? 'none' : 'initial'
    repeatTakePhoto.style.display = state === false ? 'none' : 'flex'
  }
  
  clearPhotoArea() {
    const { photoArea } = this.$()

    const context = photoArea.getContext('2d')
    context.clearRect(0, 0, photoArea.width, photoArea.height)
  }

  clearMediaProperties() {
    const { uploadFile, sentImagePreview, pdfArea } = this.$()

    uploadFile.value = ''
    sentImagePreview.src = ''

    const context = pdfArea.getContext('2d')
    context.clearRect(0, 0, pdfArea.width, pdfArea.height)
  }
}

export default AppView
