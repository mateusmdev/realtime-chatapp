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
      console.log('passou 3')
      console.log(this.state.isIconListBlock)
      const { emojiModalBtn } = this.el

      emojiModalBtn.style.visibility = 'hidden'
      emojiModalBtn.style.opacity = '0'
      emojiModalBtn.style.display = 'none'

      emojiModalBtn.disabled = true
    }
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
    contentScreen.classList.toggle('messages')
  }

  setAddContactModal(element){
    const { addContactBtn } = this.el
    const overley = document.querySelector('.overlay-layer .add-contact')

    if (element === addContactBtn){
      overley.classList.add('overlay-active')
      return
    }
    
    overley.classList.remove('overlay-active')
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

    const { emojiList } = this.el
    const emojiContainer = emojiList.parentNode
    console.log(emojiContainer)

    emojiContainer.style.marginBottom = 0
  }

  toggleMediaBar(isActiveBar = true) {
    const mediaBar = document.querySelector('.media-bar')
    if (isActiveBar === true) {
      mediaBar.classList.add('show-media-bar')
      return
    }

    mediaBar.classList.remove('show-media-bar')
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
}

export default AppView
