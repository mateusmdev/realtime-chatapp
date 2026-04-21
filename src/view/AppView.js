import AbstractView from './AbstractView'
import AudioPlayer from '../model/AudioPlayer'
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
      isPreviewMode: false,
      isDeleteAccountModalOpen: false,
      tempRecordedInterval: null,
      scrollThreshold: 150,
      messageListElements: new Map(),
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
        name: dataItem.name,
        email: dataItem.email,
        chatId: dataItem.chatId,
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
    const isPreviewMode = this.getState('isPreviewMode')
  
    if (blockMediaState === true || isPreviewMode === true) {
      const { takePhotoBtn, sendPictureBtn, sendDocumentBtn, userAboutContent, userAbout } = this.$()
      const blockedElements = [takePhotoBtn, sendPictureBtn, sendDocumentBtn]
      
      blockedElements.forEach(element => {
        this.setStyle(element, {
          opacity: '0.3',
          cursor: 'not-allowed'
        })
        element.disabled = true
      })
  
      this.setStyle(userAbout, {
        opacity: '0',
        cursor: 'not-allowed',
        visibility: 'hidden',
        display: 'none'
      })
  
      userAboutContent.setAttribute('contenteditable', false)
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
  
    if (isPreviewMode === false) {
      this.clearMockedData()
    }
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
    const [isPreviewMode, isBlockMedia] = this.getState('isPreviewMode', 'blockMedia')
    if (isPreviewMode|| isBlockMedia) return

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
    this.saveCursor()
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
    if (event.target === event.currentTarget) return
  
    const { inputContent } = this.$()
    const emoji = event.target.innerText
    const textNode = document.createTextNode(emoji)
  
    let range = this.getState('range')
  
    if (!range) {
      inputContent.focus()
  
      range = document.createRange()
      range.selectNodeContents(inputContent)
      range.collapse(false)
  
      this.setState('range', range)
    }
  
    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)
  
    range.deleteContents()
    range.insertNode(textNode)
  
    range.setStartAfter(textNode)
    range.collapse(true)
  
    inputContent.normalize()
  
    this.setState('range', range.cloneRange())
    this.toggleMessagePlaceholder()
  }

  async setSelection(event) {
    this.saveCursor()
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        this.setState('range', selection.getRangeAt(0).cloneRange())
    }
  }

  saveCursor() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const { inputContent } = this.$()

    if (!inputContent.contains(range.startContainer)) return

    this.setState('range', range.cloneRange())
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
    const { uploadFile, sentImagePreview, pdfArea, sentImageName } = this.$()

    uploadFile.value = ''
    sentImagePreview.src = ''
    sentImageName.innerText = ''

    const context = pdfArea.getContext('2d')
    context.clearRect(0, 0, pdfArea.width, pdfArea.height)
  }

  toggleSendAudioSection(open = false) {
    const { sendAudioWrapper } = this.$()

    if (open === false) {
      sendAudioWrapper.classList.add('hidden')
      return
    }
    
    sendAudioWrapper.classList.remove('hidden')
  }

  resetAudioProperties() {
    this.toggleSendAudioSection(false)
  }

  #formatTime(seconds) {
    const m = parseInt(seconds / 60)
    const s = parseInt(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  bindAudioPlayer(li, url, duration) {
    const playBtn = li.querySelector('.audio-play-btn')
    const playIcon = li.querySelector('.audio-play-icon')
    const range = li.querySelector('.audio-range')
    const timeDisplay = li.querySelector('.audio-time')

    timeDisplay.innerText = this.#formatTime(duration)

    const player = new AudioPlayer()
    let loaded = false

    playBtn.addEventListener('click', async () => {
      if (!loaded) {
        playBtn.disabled = true

        try {
          await player.load(url)
          loaded = true
        } catch (_) {
          playBtn.disabled = false
          return
        }

        playBtn.disabled = false
      }

      if (player.isPlaying) {
        player.pause()
        playIcon.src = './src/assets/play.svg'
        return
      }

      player.play(
        (currentTime, totalDuration) => {
          const ratio = currentTime / totalDuration
          range.value = ratio * 100
          timeDisplay.innerText = this.#formatTime(currentTime)
        },
        () => {
          playIcon.src = './src/assets/play.svg'
          range.value = 0
          timeDisplay.innerText = this.#formatTime(duration)
        }
      )

      playIcon.src = './src/assets/pause.svg'
    })

    range.addEventListener('input', () => {
      const ratio = range.value / 100
      player.seek(ratio)

      if (!player.isPlaying) {
        timeDisplay.innerText = this.#formatTime(ratio * duration)
      }
    })
  }

  addMessage(data, isFromContact = false) {
    if (!data) return

    const li = document.createElement(`li`)
    li.className = `message`

    isFromContact === true ? li.classList.add('contact') : li.classList.add('user')

    switch (data.type) {
      case 'contact-attachment':
        li.innerHTML = `
          <div class="content contact-attachment">
            <div class="detail">
              <div class="picture-wrapper">
                <img 
                  class="profile-picture"
                  src="${data.contactPicture}" 
                  alt="contact picture"
                >
              </div>
              <p class="contact-name">${data.contactName}</p>
            </div>
            <a href="#" class="send-message"
              data-contact-name="${data.contactName}"
              data-contact-email="${data.contactEmail}"
              data-contact-picture="${data.contactPicture}">
              <span>Enviar Mensagem</span>
            </a>
          </div>
        `
      break
      
      case 'picture':
        li.innerHTML = `
          <div class="content picture">
            <div class="image-area">
              <img src="${data.content}" alt="an image">
            </div>
          </div>
        `
      break

      case 'file':
        li.innerHTML = `
          <div class="content file">
          <div>
            <img 
              class="file-img"
              src="./src/assets/document-icon.svg" 
              alt="file icon"
            >
            <p class="file-name">${data.fileName}</p>
          </div>
          <a href="#" class="dowload-btn" data-url="${data.content}" data-filename="${data.fileName}">
            <img src="./src/assets/download.svg" alt="download icon">
          </a>
        </div>
        `
      break

      case 'audio':
        li.innerHTML = `
          <div class="content audio">
            <div class="picture-wrapper">
              <img 
                class="profile-picture"
                src="${data.profilePicture}" 
                alt="contact picture"
              >
            </div>
            <div class="detail">
              <div class="player">
                <button class="audio-play-btn">
                  <img class="audio-play-icon" src="./src/assets/play.svg" alt="play icon">
                </button>
                <input type="range" name="audio-range" class="audio-range" min="0" max="100" value="0">
              </div>
              <div class="meta-data">
                <p class="audio-time">00:00</p>
              </div>
            </div>
          </div>
        `

        this.bindAudioPlayer(li, data.content, data.duration)
      break

      default:
        li.innerHTML = `
          <div class="content text">
            ${data.content}
          </div>
        `
    }

    const { messageList } = this.$()
    messageList.appendChild(li)
  }

  isAtBottom() {
    const chat = this.$('chat')
    const distanceFromBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight
    return distanceFromBottom <= this.getState('scrollThreshold')
  }
  
  scrollToBottom() {
    const chat = this.$('chat')
    chat.scrollTop = chat.scrollHeight
  }

  updateDocumentPreview(fileName) {
    const fileAreaName = this.$('fileAreaName')
    fileAreaName.innerText = fileName
  }

  clearMockedData() {
    const { contactModalList } = this.$()
    contactModalList.innerHTML = ''
  }
  
  loadContactsModal(contacts, options = {}) {
    const { contactModalList } = this.$()
    contactModalList.innerHTML = ''
  
    contacts.forEach(contact => {
      const li = document.createElement('li')
      li.innerHTML = `
        <div class="picture-wrapper">
          <img 
            class="profile-picture" 
            src="${contact.profilePicture ?? contact.picture}" 
            alt="contact picture"
          >
        </div>
        <span>${contact.name}</span>
      `
  
      this.addEvent(li, {
        eventName: 'click',
        fn: () => options.handleCallback(contact),
        behavior: {
          preventDefault: true
        }
      })
  
      contactModalList.appendChild(li)
    })
  }

  toggleConfirmChatModal(contactData = null) {
    const { media } = this.$()
    const card = media.querySelector('.list-contact .card')
    const confirmModal = media.querySelector('.confirm-chat-modal')
    const confirmContactName = this.$('confirmContactName')

    if (contactData) {
      confirmContactName.innerText = contactData.name
      card.style.display = 'none'
      confirmModal.classList.add('active')
      this.toggleMediaModal('list-contact')
      return
    }

    card.style.display = ''
    confirmModal.classList.remove('active')
    this.toggleMediaModal()
  }

  toggleDeleteAccountModal() {
    const { deleteAccountModal } = this.$()
    const isOpen = this.getState('isDeleteAccountModalOpen')

    if (!isOpen) {
      this.setDeleteAccountLoading(false)
    }

    deleteAccountModal.classList.toggle('active', !isOpen)
    this.setState('isDeleteAccountModalOpen', !isOpen)
  }

  setDeleteAccountLoading(isLoading) {
    const { confirmDeleteAccountBtn, deleteAccountBtnLabel, deleteAccountLoading } = this.$()

    if (isLoading) {
      confirmDeleteAccountBtn.classList.add('loading')
      deleteAccountBtnLabel.style.display = 'none'
      deleteAccountLoading.classList.remove('hidden')
    } else {
      confirmDeleteAccountBtn.classList.remove('loading')
      deleteAccountBtnLabel.style.display = ''
      deleteAccountLoading.classList.add('hidden')
    }
  }

  async openPicture(sentPicture) {
    const imgElement = sentPicture.querySelector('.image-area img')
    const { sentImagePreview, sentImageName  } = this.$()
    sentImagePreview.src = imgElement.src
    sentImageName.innerText = ''

    await this.toggleMediaModal('image-preview')
  }

  renderMessageList(sortedItems, options = {}) {
    const { messageContainer } = this.$()
    const existingElements = this.getState('messageListElements')

    const incomingChatIds = new Set(sortedItems.map(item => item.chatId))
    for (const [chatId, element] of existingElements) {
        if (!incomingChatIds.has(chatId)) {
            element.remove()
            existingElements.delete(chatId)
        }
    }

    sortedItems.forEach(itemData => {
        let element = existingElements.get(itemData.chatId)

        if (!element) {
            element = this.#buildMessageListItem(itemData, options)
            existingElements.set(itemData.chatId, element)
        } else {
            this.#updateMessageListItemDOM(element, itemData)
        }

        messageContainer.appendChild(element)  // move to end = sorted position
    })
  }

  #buildMessageListItem(itemData, options = {}) {
      const li = document.createElement('li')
      li.className = 'item'
      li.dataset.chatId = itemData.chatId

      li.innerHTML = `
          <div class="picture-wrapper">
              <img
                  src="${itemData.profilePicture}"
                  alt="${itemData.name}"
                  class="profile-picture"
              >
          </div>
          <div class="message-data">
              <p class="name">${itemData.name}</p>
              <p class="message-content">
                  <span class="message-status ${itemData.isFromMe ? 'visualized' : ''}"></span>
                  ${this.#resolveLastMessageText(itemData.lastMessage, itemData.isFromMe)}
              </p>
              <p class="time-message">${this.#formatMessageTime(itemData.lastMessage.timeStamp)}</p>
          </div>
      `

      const callbackParam = {
          profileImage: itemData.profilePicture,
          name: itemData.name,
          email: itemData.email,
          chatId: itemData.chatId,
      }

      this.addEvent(li, {
          eventName: 'click',
          fn: event => options.handleCallback(event, callbackParam),
          behavior: { preventDefault: true }
      })

      const profilePicEl = li.querySelector('.profile-picture')
      if (profilePicEl) {
          profilePicEl.style.borderRadius = this.getState('appStyle') === 'circle' ? '50%' : '5px'
      }

      return li
  }

  #updateMessageListItemDOM(element, itemData) {
      const nameEl    = element.querySelector('.name')
      const contentEl = element.querySelector('.message-content')
      const timeEl    = element.querySelector('.time-message')
      const imgEl     = element.querySelector('.profile-picture')

      if (imgEl)     imgEl.src = itemData.profilePicture
      if (nameEl)    nameEl.textContent = itemData.name
      if (timeEl)    timeEl.textContent = this.#formatMessageTime(itemData.lastMessage.timeStamp)
      if (contentEl) contentEl.innerHTML = `
          <span class="message-status ${itemData.isFromMe ? 'visualized' : ''}"></span>
          ${this.#resolveLastMessageText(itemData.lastMessage, itemData.isFromMe)}
      `
  }

  #resolveLastMessageText(lastMessage, isFromMe) {
      const prefix = isFromMe ? 'Você: ' : ''

      const typeMap = {
          'picture':            '📷 Foto',
          'audio':              '🎵 Áudio',
          'file':               `📄 ${lastMessage.fileName ?? 'Arquivo'}`,
          'contact-attachment': `👤 ${lastMessage.contactName ?? 'Contato'}`,
      }

      if (typeMap[lastMessage.type]) {
          return `${prefix}${typeMap[lastMessage.type]}`
      }

      const content = lastMessage.content ?? ''
      const truncated = content.length > 35 ? `${content.substring(0, 35)}...` : content
      return `${prefix}${truncated}`
  }

  #formatMessageTime(timestamp) {
      if (!timestamp) return ''

      const date = new Date(timestamp)
      const now  = new Date()

      const isToday = date.toDateString() === now.toDateString()

      if (isToday) {
          return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }

      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const isYesterday = date.toDateString() === yesterday.toDateString()

      if (isYesterday) return 'ontem'

      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      if (diffDays < 7) {
          return date.toLocaleDateString('pt-BR', { weekday: 'short' })
                    .replace('-feira', '')
                    .replace('.', '')
                    .trim()
      }

      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
}

export default AppView