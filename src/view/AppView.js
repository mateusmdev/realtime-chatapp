import AbstractView from './AbstractView'
import './../sass/app.scss'

class AppView extends AbstractView{
  
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
      range: null
    }
  }

  loadUserContent(data){
    if (!data) return

    const profilePictures = document.querySelectorAll('.profile-picture')
    const { userNameContent, userAboutContent, userEmailContent } = this.el

    document.title = data.name;
    [...profilePictures].forEach(picture => {
      picture.src = data.profilePicture ?? data.picture
    })

    userNameContent.innerText = data.name
    userAboutContent.innerText = data.about
    userEmailContent.innerText = data.email
  }

  initLayout(){
    if (this.state.blockMedia === true) {
      const { takeScreenshotBtn, sendPictureBtn, sendDocumentBtn } = this.el

      const blockedElements = [takeScreenshotBtn, sendPictureBtn, sendDocumentBtn];
      
      blockedElements.forEach(element => {
        element.style.opacity = '0.3'
        element.style.cursor = 'not-allowed'
        element.disabled = true
      })
    }

    if (this.state.isIconListBlock === true) {
      const { emojiModalBtn } = this.el

      emojiModalBtn.style.visibility = 'hidden'
      emojiModalBtn.style.opacity = '0'
      emojiModalBtn.style.display = 'none'

      emojiModalBtn.disabled = true
    }

    placeholder.innerText = this.state.placeholderText

    const { splashScreen } = this.el
    splashScreen.remove()
  }

  closeConcorrentModal() {
    const event = new CustomEvent('closeModal', {
      bubbles: false,
      cancelable: true,
      composed: false
    })

    const { messageScreen } = this.el
    messageScreen.dispatchEvent(event)
  }

  changeSection(button){
    const { messageSection, contactSection, settingSection } = this.el
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
  
  messageScreenToggle(){
    const contentScreen = document.querySelector('main')
    const homeScreen = document.querySelector('main section.home')
    const messageScreen = document.querySelector('main section.message-screen')

    contentScreen.classList.toggle('messages')

    if (contentScreen.classList.contains('messages')) {
      messageScreen.classList.remove('hidden')
      homeScreen.classList.add('hidden')
      
      return
    }

    messageScreen.classList.add('hidden')
    homeScreen.classList.remove('hidden')
  }

  setAddContactModal(element){
    const { addContactBtn, addContactSection } = this.el

    if (element === addContactBtn){
      addContactSection.classList.add('overlay-active')
      return
    }
    
    addContactSection.classList.remove('overlay-active')
  }

  loadEmoji(data){

    if (!data || data?.length < 1) {
      this.state.isIconListBlock = true
      return
    }

    const { emojiList } = this.el
    const emojiPromises = data.map(emoji => {
      return new Promise((resolve, reject) => {
        const li = this.createElement('li', emojiList, {
          'emoji-name': emoji.slug
        })

        li.textContent = emoji.character
        resolve()
      })
    })
    
    this.state.isIconListBlock = false
    Promise.all(emojiPromises)    
  }

  toggleEmojiModal(){
    if (this.state.isIconListBlock === true) {
      return
    }
    
    if (this.state.isMediaBarOpen  === true) {
      this.closeConcorrentModal()
    }
    
    const { emojiList } = this.el
    const emojiContainer = emojiList.parentNode
    
    this.state.isEmojiModalOpen = !this.state.isEmojiModalOpen
    
    emojiContainer.style.marginBottom = this.state.isEmojiModalOpen ? 'initial' : '-12.5rem'
  }
  
  toggleMediaBar() {
    if (this.state.isEmojiModalOpen === true) {
      this.closeConcorrentModal()
    }

    const mediaBar = document.querySelector('.media-bar')
    const state = this.state.isMediaBarOpen
    const toggleMethod = state ? mediaBar.classList.remove : mediaBar.classList.add
    
    toggleMethod.call(mediaBar.classList, 'show-media-bar')
    this.state.isMediaBarOpen = !this.state.isMediaBarOpen
  }

  toggleMediaModal(isShowModal = true, mediaType = '') {
    const { media } = this.el
    const modals = [...media.querySelectorAll('.media-type')]
    
    if (isShowModal) {
      const selectedModal = modals.find(currentModal => {
        const classes = [...currentModal.classList]
        return classes.includes(mediaType)
      })

      selectedModal.style.display = 'flex'
      media.classList.add('overlay-active')
      this.toggleMediaBar(false)
      
      return
    }
    
    media.classList.remove('overlay-active')
    modals.forEach(currentModal => currentModal.style.display = 'none')
  }

  async setDefaultMode(event) {
    const { inputContent, placeholder } = this.el

    const IsIgnoredElements = event.target === inputContent || event.target === placeholder

    if (IsIgnoredElements === true) return

    const classList =['icon-container', 'media-bar']

    const result = classList.some(item => {
      const contain = event.target.classList.contains(item)

      return contain
    })

    if (result === true) return;
  
    if (this.state.isMediaBarOpen === true) {
      this.toggleMediaBar()
      return
    }

    if (this.state.isEmojiModalOpen === true) {
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

    //Code to makes changes in firebase comes here
  }

  async toggleMessagePlaceholder(event) {
    const { inputContent, placeholder, microphoneBtn, sendBtn } = this.el
    const message = inputContent.innerText.trim()

    if (message.length < 1) {
      placeholder.innerText = this.state.placeholderText
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
      const { inputContent } = this.el
      const emoji = event.target
      const textNode = document.createTextNode(emoji.innerText)

      if (!this.state.range) {
          inputContent.focus();
          return;
      }

      const selection = window.getSelection()
      selection.removeAllRanges();
      selection.addRange(this.state.range)

      const range = selection.getRangeAt(0)
      range.deleteContents()

      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)

      this.state.range = range.cloneRange()
    }
  }

  async setSelection(event) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        this.state.range = selection.getRangeAt(0).cloneRange();
    }
  }
}

export default AppView
