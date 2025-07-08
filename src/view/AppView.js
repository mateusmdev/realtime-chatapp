import AbstractView from './AbstractView'
import './../sass/app.scss'

class AppView extends AbstractView{
  
  constructor(){
    super()
  }

  _initState() {
    return {
      blockMedia: true,
      isIconListBlock: true,
      isEmojiModalOpen: false,
      isMediaBarOpen: false,
    }
  }

  setUserContent(data){
    if (!data) return

    const profilePictures = document.querySelectorAll('.profile-picture')

    document.title = data.name;
    [...profilePictures].forEach(picture => {
      picture.src = data.picture
    })
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
      return new Promise(() => {
        const li = this.createElement('li', emojiList, {
          'emoji-name': emoji.slug
        })

        li.textContent = emoji.character
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

  async setDefaultMode(e) {
    const classList =['icon-container', 'media-bar']

    const result = classList.some(item => {
      const contain = e.target.classList.contains(item)

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
}

export default AppView
