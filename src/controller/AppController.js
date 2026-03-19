import AppView from './../view/AppView'
import axios from 'axios'
import LocalStorage from '../utils/LocalStorage'
import User from '../model/User'
import Chat from '../model/Chat'
import Message from '../model/Message'
import MediaContext from './../model/MediaContext'
import MediaFactory from '../model/MediaFactory'
import Camera from '../model/Camera'
import ProfileCache from '../utils/ProfileCache'
import CloudinaryService from '../service/CloudinaryService'

const TOKEN_VALIDATOR = import.meta.env.VITE_TOKEN_VALIDATOR
const ICON_KEY = import.meta.env.VITE_ICON_KEY
const BLOCK_MEDIA = import.meta.env.VITE_BLOCK_MEDIA

class AppController {
  #view = new AppView()
  #currentChatId = null
  #messageListener = null
  #pendingMediaFile = null
  #pendingDocumentFile = null
  #pendingContactData = null
  
  async initEvents(){
    
    this.#view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.initApp(),
    })

    this.#view.addEvent('#exitBtn', {
      eventName: 'click',
      fn: () => this.signOut(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEventAll(['#chatMenuBtn', '#contactMenuBtn', '#settingMenuBtn'], {
      eventName: 'click',
      fn: (e) => this.handleMenuBtnClick(e),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEventAll('.item', {
      eventName: 'click',
      fn: (e) => this.handleMessageItem(e),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#backBtn', {
      eventName: 'click',
      fn: (e) => this.handleBackBtn(e),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEventAll(['#addContactBtn', '#cancelAddContact'], {
      eventName: 'click',
      fn: (e) => this.#view.setAddContactModal(e.currentTarget),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEvent('#emojiModalBtn', {
      eventName: 'click',
      fn: (event) => this.#view.toggleEmojiModal(event),
      behavior: {
        preventDefault: true,
        stopPropagation: true
      }
    })

    this.#view.addEvent('#attachmentBtn', {
      eventName: 'click',
      fn: () => this.#view.toggleMediaBar(),
      behavior: {
        preventDefault: true,
        stopPropagation: true
      }
    })

    this.#view.addEventAll(['#takePhotoBtn', '#sendPictureBtn', '#sendDocumentBtn', '#sendContactBtn'], {
      eventName: 'click',
      fn: (e) => this.handleMediaButton(e),
      behavior: {
        preventDefault: true,
        stopPropagation: true
      }
    })

    this.#view.addEvent('#closeMediaModalBtn', {
      eventName: 'click',
      fn: () => this.handleCloseMediaModal(false),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#uploadFile', {
      eventName: 'change',
      fn: (e) => this.handleChangeInputFile(e),
      behavior: {
        preventDefault: false
      }
    })

    this.#view.addEvent('#messageScreen', {
      eventName: 'click closeModal',
      fn: (e) => this.#view.setDefaultMode(e),
      behavior: {
        preventDefault: false,
        stopPropagation: true
      }
    })
    
    this.#view.addEvent('#mediaBar', {
      eventName: 'click',
      fn: (e) => e.stopPropagation(),
      behavior: {
        preventDefault: false,
      }
    })

    this.#view.addEvent('#emojiList', {
      eventName: 'click',
      fn: (event) => this.#view.addEmoji(event),
      behavior: {
        preventDefault: false,
        stopPropagation: true
      }
    })
    
    this.#view.addEventAll(['#userNameContent', '#userAboutContent'], {
      eventName: 'keypress blur',
      fn: (e) => this.#view.setUserContent(e)
    })

    this.#view.addEvent('#changeImgBtn', {
      eventName: 'click',
      fn: (e) =>  this.#view.$('profileImageFile').click(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#profileImageFile', {
      eventName: 'change',
      fn: (e) => this.handleProfileImageFile(e),
      behavior: {
        preventDefault: false
      }
    })

    this.#view.addEvent('#inputContent', {
      eventName: 'keyup',
      fn: (e) => this.#view.toggleMessagePlaceholder(e),
      behavior: {
        preventDefault: false
      }
    })

    this.#view.addEvent('#inputContent', {
      eventName: 'keypress',
      fn: (e) => this.handleSendMessage(e),
      behavior: {
        preventDefault: false
      }
    })

    this.#view.addEvent('#sendBtn', {
      eventName: 'click',
      fn: (event) => this.handlerSendMessage(event),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEvent('#inputContent', {
      eventName: 'mouseup',
      fn: (event) => this.#view.setSelection(event),
      behavior: {
        preventDefault: false
      }
    })

    this.#view.addEventAll(['#userNameContent', '#userAboutContent'], {
      eventName: 'saveData',
      fn: (event) => this.handleUpdateUserData(event),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#insertContactBtn', {
      eventName: 'click',
      fn: (event) => this.handleAddContact(event),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('.custom-input button', {
      eventName: 'click',
      fn: (event) => this.handleToggleStyle(event),
      behavior: {
        preventDefault: false,
      }
    })

    this.#view.addEvent('#takePhotoActionBtn', {
      eventName: 'click',
      fn: async (event) => this.takePhotoActionBtn(event),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#repeatTakePhoto', {
      eventName: 'click',
      fn: async (event) => this.handleRepeatTakePhoto(event),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#microphoneBtn', {
      eventName: 'click',
      fn: async (event) => this.startRecordMicrophoneAudio(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#okRecordingBtn', {
      eventName: 'click',
      fn: async (event) => this.handleSendAudio(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#cancelRecordingBtn', {
      eventName: 'click',
      fn: async (event) => this.handleStopRecordAudio(event),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#sendImageActionBtn', {
      eventName: 'click',
      fn: async () => this.handleSendImage(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#sendPhotoActionBtn', {
      eventName: 'click',
      fn: async () => this.handleSendPhotoImage(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#sendFileActionBtn', {
      eventName: 'click',
      fn: async () => this.handleSendDocument(),
      behavior: {
        preventDefault: true,
      }
    })
    
    this.#view.addEvent('#sendPdfActionBtn', {
      eventName: 'click',
      fn: async () => this.handleSendDocument(),
      behavior: {
        preventDefault: true,
      }
    })

    this.#view.addEvent('#messageList', {
      eventName: 'click',
      fn: (e) => {
        this.handleDownloadFile(e)
        this.handleSendMessageFromContact(e)
      },
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEvent('#cancelConfirmChat', {
      eventName: 'click',
      fn: () => {
        this.#pendingContactData = null
        this.#view.toggleConfirmChatModal()
      },
      behavior: { preventDefault: true }
    })

    this.#view.addEvent('#confirmConfirmChat', {
      eventName: 'click',
      fn: () => this.handleConfirmSendMessage(),
      behavior: { preventDefault: true }
    })
  }

  async initApp(){
    this.#view.setState('blockMedia', BLOCK_MEDIA || false)
    
    const blockMediaState = this.#view.getState('blockMedia')

    if (typeof blockMediaState === 'string') {
      this.#view.setState('blockMedia', JSON.parse(blockMediaState))
    }

    const preferences = JSON.parse(LocalStorage.getUserPreferences()) || {}
    const params = new URLSearchParams(window.location.search)
    const mode = params.get('mode')
    const isPreview = mode === 'preview' ? true : false 

    this.#view.setState('isPreviewMode', isPreview)

    if (!isPreview) {
      await this.getUserData()
    }

    await this.getIconData()
    await this.#view.initLayout(preferences)
    
    if (!isPreview) {
      const cacheObject = ProfileCache.get()
      const contacts = cacheObject?.cache || []
      const sortedContacts = [...contacts].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    
      const options = {
        handleCallback: this.handleSendContact.bind(this)
      }
    
      this.#view.loadContactsModal(sortedContacts, options)
    }
  }

  async getUserData(){
    const accessToken = LocalStorage.getAccessToken()

    if (!accessToken) {
      window.location.href = '/'
    }

    try {
      const response = await axios.get(TOKEN_VALIDATOR, {
        headers: {
        'Authorization': `Bearer ${accessToken}`
        }
      });

      const { data } = response

      const user = new User({
        ...data,
        profilePicture: data.picture,
        about: 'I am using Realtime Chat App',
      });

      await user.findOrCreate()
      const cacheObject = ProfileCache.get()
      const contacts = await user.getContactsFromCache(!cacheObject?.isCached)

      const sortedContacts = [...contacts].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      
      await user.onSnapshot(() => {
        LocalStorage.setUserData(JSON.stringify(user.data))
        this.#view.loadUserContent(user.data)
      })

      const options = {
        handleCallback: this.handleContactItem.bind(this)
      }

      await this.#view.loadContacts(sortedContacts, options)

    } catch (error) {
      localStorage.clear()
      window.location.href = '/'
      throw error
    }
  }

  async getIconData(){
    let iconList = LocalStorage.getIconList() ?? []
    if (typeof iconList === 'string') iconList = JSON.parse(iconList)

    const isEmpty = !Array.isArray(iconList) || iconList.length < 1
    
    if (isEmpty) {
      try {
        const response = await axios.get(`https://emoji-api.com/emojis?access_key=${ICON_KEY}`);
        
        iconList = response.data || []
        LocalStorage.setIconList(JSON.stringify(iconList))
      } catch (error) {
        iconList = []
      }
    }
    
    this.#view.loadEmoji(iconList)
  }

  signOut(){
    LocalStorage.clearSession()
    ProfileCache.clear()
    window.location.href = '/'
  }

  handleMenuBtnClick(e){
    this.#view.changeSection(e.currentTarget)
  }
  
  async handleContactItem(e, data) {
    const isCorrectTarget = e.currentTarget.id === 'back-btn'
    this.#view.updateMessageScreen(data)
    this.#view.toggleMessageScreen(!isCorrectTarget)

    if (isCorrectTarget){
      this.#view.toggleMediaModal()
      return
    }

    await this.openChat(data)
  }

  async openChat(data) {
    if (this.#messageListener) {
      this.#messageListener.offSnapshot()
      this.#messageListener = null
    }

    this.#currentChatId = data.chatId
    const { messageList } = this.#view.$()
    const userData = JSON.parse(LocalStorage.getUserData())

    messageList.innerHTML = ''

    let isInitialLoad = true

    this.#messageListener = Message.listenByChatId(this.#currentChatId, (messages) => {
      const shouldScroll = isInitialLoad || this.#view.isAtBottom()

      messages.forEach(currentMessage => {
        const { data } = currentMessage
        this.#view.addMessage(data, data.from !== userData.email)
      })

      if (shouldScroll) {
        this.#view.scrollToBottom()
      }

      isInitialLoad = false
    })
  }

  handleMessageItem(e){
    const isCorrectTarget = e.currentTarget.id === 'back-btn'
    this.#view.toggleMessageScreen(!isCorrectTarget)
    
    if (isCorrectTarget){
      this.#view.toggleMediaModal()
    }
  }

  handleCloseMediaModal(){
    this.#pendingMediaFile = null
    this.#pendingDocumentFile = null
    this.#view.toggleMediaModal()

    if (this.#view.getState('isVideoRecording')) {
      const camera = Camera.getInstance()
      camera.stop()

      this.#view.setState('isVideoRecording', false)
    }

    this.#view.setState('isPhotoAreaVisible', false)
    this.#view.clearPhotoArea()
    this.#view.togglePhotoArea()
    this.#view.togglePhotoAction()
    this.#view.clearMediaProperties()
  }

  async handleMediaButton(e) {
    const { id } = e.currentTarget
    const { uploadFile } = this.#view.$()

    this.#view.setState('mediaButtonId', id)

    const blockMessage = () => {
      alert('This feature is not allowed on my server. Run the project on your machine and enable it for use.')
    }

    switch(id) {
      case 'send-contact-btn':
        this.#view.toggleMediaModal('list-contact')
        break

      case 'send-document-btn':
        if (this.#view.getState('blockMedia') === true) {
          blockMessage()
          return
        }

        this.handlerUploadFileClick(uploadFile, {
          idMedia: 'send-document-btn'
        })

        break

      case 'take-photo-btn':
        if (this.#view.getState('blockMedia') === true) {
          blockMessage()
          return
        }

        this.#view.setDefaultMode(e)
        await this.openCamera()
        break
        
      case 'send-picture-btn':
        if (this.#view.getState('blockMedia') === true) {
          blockMessage()
          return
        }

        this.handlerUploadFileClick(uploadFile, {
          idMedia: 'send-picture-btn'
        })

        break
    }
  }
  
  async handleChangeInputFile(event) {
    const id = this.#view.getState('mediaButtonId')
    const [uploadedFile] = event.target.files
    const { pdfArea, fileArea, sentImagePreview, sentImageName } = this.#view.$()
    this.#view.clearMediaProperties()
  
    if (!uploadedFile) return
  
    const isPdf = uploadedFile?.type === 'application/pdf'
    const componentData = {}
  
    if (uploadedFile.type.startsWith('image/') && id === 'send-document-btn') {
      this.#pendingDocumentFile = uploadedFile
      this.#view.updateDocumentPreview(uploadedFile.name)
  
      componentData.selectedArea = fileArea
      componentData.modalClass = 'documents'
  
    } else if (uploadedFile.type.startsWith('image/') && id === 'send-picture-btn') {
      this.#pendingMediaFile = uploadedFile
  
      componentData.selectedArea = {
        image: sentImagePreview,
        name: sentImageName
      }
  
      componentData.modalClass = 'image-preview'
  
    } else if (isPdf) {
      this.#pendingDocumentFile = uploadedFile
  
      componentData.selectedArea = pdfArea
      componentData.modalClass = 'pdf-preview'
  
    } else {
      this.#pendingDocumentFile = uploadedFile
      this.#view.updateDocumentPreview(uploadedFile.name)
  
      componentData.selectedArea = fileArea
      componentData.modalClass = 'documents'
    }
  
    const mediaInstance = MediaFactory.getInstance(id)
    const mediaHandler = new MediaContext(mediaInstance)
    const uploadData = {
      file: uploadedFile,
      area: componentData.selectedArea
    }
  
    if (mediaInstance != null) {
      await mediaHandler.execute(uploadData)
    }
  
    await this.#view.toggleMediaModal(componentData.modalClass)
    this.#view.setDefaultMode(event)
  }

  async handleProfileImageFile(e) {
    const [uploadedFile] = e.target.files
    const imageUrl = URL.createObjectURL(uploadedFile)
    const profilePictures = document.querySelectorAll('.profile-picture');

    [...profilePictures].forEach(picture => {
      picture.src = imageUrl
    })
  }

  async handleSendMessage(event) {
    const isModifiedPressed = event.shiftKey  === true || event.ctrlKey === true
    const keyPressed = event.key === 'Enter' ?? event.code === 'Enter'
    
    if (keyPressed === true && !isModifiedPressed === true) {
      event.preventDefault()
      const { sendBtn } = this.#view.$()
      sendBtn.click()

      return
    }
  }

  async handleUpdateUserData(event) {
    const changesValues = Object.values(event.detail.changes)
    const userData = JSON.parse(LocalStorage.getUserData())
    const { fieldName, value }= event.detail

    const wasModified = changesValues.some(currentValue => {
      if (currentValue === true && userData[fieldName] !== value) {
        return true
      }

      return false
    })
    
    if (wasModified) {
      const { changes, value } = event.detail

      const user = new User({
        ...userData,
        name: changes.name ? value : userData.name,
        about: changes.about ? value : userData.about,
      })
  
      await user.save()
    }
  }

  async handleAddContact(event) {
    const value = this.#view.$('contactInput').value
    const userData = JSON.parse(LocalStorage.getUserData())
  
    if (value.trim() === '' || value.trim() === userData.email) return
  
    const contact = new User({ email: value })
    const result = await contact.getDocument()
  
    if (result !== null) {
      try {
        const userA = new User(userData)
        const userB = new User(result)
  
        let chat = await Chat.findByUsers(userData.email, result.email)
  
        if (!chat) {
          chat = await Chat.create(userData.email, result.email)
        }
  
        const chatId = chat.data.id
  
        await userA.saveContact({
          email: result.email,
          profilePicture: result.profilePicture,
          picture: result.picture,
          name: result.name,
          chatId,
        })
  
        await userB.saveContact({
          email: userData.email,
          profilePicture: userData.profilePicture,
          picture: userData.picture,
          name: userData.name,
          chatId,
        })
  
        const freshContacts = await userA.getContactsFromCache(true)
        const sortedContacts = [...freshContacts].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
  
        await this.#view.loadContacts(sortedContacts, {
          handleCallback: this.handleContactItem.bind(this)
        })
  
        this.#view.loadContactsModal(sortedContacts, {
          handleCallback: this.handleSendContact.bind(this)
        })
  
      } catch (error) {
        throw error
      }
  
      this.#view.setAddContactModal(this.#view.$('cancelAddContact'))
    } else {
      this.#view.toggleContactError(true)
    }
  }

  async handleToggleStyle(event) {
    let preferences = JSON.parse(LocalStorage.getUserPreferences()) ?? {}

    const appStyle = this.#view.getState('appStyle') === 'circle' ? 'square' : 'circle'
    this.#view.setState('appStyle', appStyle)
    
    preferences = {
      ...preferences,
      appStyle: this.#view.getState('appStyle')
    }
    
    LocalStorage.setUserPreferences(JSON.stringify(preferences))
    this.#view.setAppStyle()
  }

  async openCamera() {
    const camera = Camera.getInstance()
    
    if (!camera.isSupported()) {
      alert("Your browser does not support camera access or the page is not using HTTPS.")
      return
    }
    
    this.#view.toggleMediaModal('take-photo')

    try {
      if (!this.#view.getState('isVideoRecording')) {
        const { videoArea } = this.#view.$()

        videoArea.srcObject = await camera.getStream()
        videoArea.play()

        this.#view.setState('isVideoRecording', true)
      }

    } catch (error) {
      alert("An error occurred while trying to access the camera.")
    }    
  }

  async handleRepeatTakePhoto() {
    this.#view.setState('isPhotoAreaVisible', false)
        
    this.#view.clearPhotoArea()
    this.#view.togglePhotoArea()
    this.#view.togglePhotoAction()

    await this.openCamera()
  }

  async takePhotoActionBtn() {
    const { photoArea, videoArea } = this.#view.$()
    const camera = Camera.getInstance()
    const photoSettings = {
      mimeType: 'image/png',
      origin: videoArea,
      width: videoArea.videoWidth,
      height: videoArea.videoHeight,
      renderArea: photoArea
    }

    const result = camera.takePhoto(photoSettings)
    camera.stop()
    
    this.#view.setState('isVideoRecording', false)
    this.#view.setState('isPhotoAreaVisible', true)
  
    this.#view.togglePhotoArea()
    this.#view.togglePhotoAction()
  }

  async handlerSendMessage() {
    const { messageList, inputContent } = this.#view.$()
    const messageLength = inputContent.innerText.trim().length

    if (messageLength > 0 && this.#currentChatId !== null) {
      const userData = JSON.parse(LocalStorage.getUserData())

      const messageData = {
        content: inputContent.innerText.trim(),
        type: 'text',
        status: 'wait',
        timeStamp: Date.now(),
        from: userData.email,
      }

      const message = new Message(messageData, this.#currentChatId)

      const event = new CustomEvent('keyup', {
        bubbles: false,
        cancelable: true,
        composed: false
      })

      inputContent.textContent = ''
      inputContent.dispatchEvent(event)

      await message.send()
    }
  }

  handlerUploadFileClick(inputFile, settings = {}) {
    const { idMedia } = settings

    const dictionary = {
      'send-document-btn': '*',
      'send-picture-btn': 'image/*'
    }

    const mediaType = dictionary[idMedia]
    inputFile.setAttribute('accept', mediaType)

    inputFile.click()
  }

  async handleBackBtn(event) {
    await this.handleMessageItem(event)
    const state = this.#view.getState('isMediaModalOpen')

    if (state === true) {
      this.handleCloseMediaModal(event)
    }
  }

  async startRecordMicrophoneAudio() {
    this.#view.toggleSendAudioSection(true)
    const start = Date.now()
    const { microphoneTimer } = this.#view.$()

    const recordedTime = setInterval(() => {
      const time = Date.now() - start

      const seconds = parseInt((time / 1000) % 60)
      const minutes = parseInt((time / (1000 * 60) % 60))

      microphoneTimer.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }, 100)

    this.#view.setState('tempRecordedInterval', recordedTime)
  }

  async handleStopRecordAudio(event) {
    const interval = this.#view.getState('tempRecordedInterval')
    clearInterval(interval)

    this.#view.resetAudioProperties()
  }

  async handleSendAudio(event) {
    const interval = this.#view.getState('tempRecordedInterval')
    clearInterval(interval)
    
    this.#view.resetAudioProperties()
  }

  async handleSendImage() {
    if (!this.#pendingMediaFile || !this.#currentChatId) return

    try {
      const url = await CloudinaryService.upload(this.#pendingMediaFile)
      const userData = JSON.parse(LocalStorage.getUserData())

      const messageData = {
        content: url,
        type: 'picture',
        status: 'wait',
        timeStamp: Date.now(),
        from: userData.email,
      }

      const message = new Message(messageData, this.#currentChatId)
      await message.send()

      this.#pendingMediaFile = null
      this.handleCloseMediaModal()

    } catch (error) {
      alert('Erro ao enviar a imagem. Tente novamente.')
    }
  }

  async handleSendPhotoImage() {
    if (!this.#currentChatId) return
  
    try {
      const { photoArea } = this.#view.$()
      const base64 = photoArea.toDataURL('image/png')
  
      const url = await CloudinaryService.uploadBase64(base64)
      const userData = JSON.parse(LocalStorage.getUserData())
  
      const messageData = {
        content: url,
        type: 'picture',
        status: 'wait',
        timeStamp: Date.now(),
        from: userData.email,
      }
  
      const message = new Message(messageData, this.#currentChatId)
      await message.send()
  
      this.handleCloseMediaModal()
  
    } catch (error) {
      alert(error.message || 'Erro ao enviar a imagem. Tente novamente.')
    }
  }

  async handleSendDocument() {
    if (!this.#pendingDocumentFile || !this.#currentChatId) return
  
    try {
      const url = await CloudinaryService.uploadRaw(this.#pendingDocumentFile)
      const userData = JSON.parse(LocalStorage.getUserData())
  
      const messageData = {
        content: url,
        fileName: this.#pendingDocumentFile.name,
        type: 'file',
        status: 'wait',
        timeStamp: Date.now(),
        from: userData.email,
      }
  
      const message = new Message(messageData, this.#currentChatId)
      await message.send()
  
      this.#pendingDocumentFile = null
      this.handleCloseMediaModal()
  
    } catch (error) {
      alert(error.message || 'Erro ao enviar o arquivo. Tente novamente.')
    }
  }

  async handleDownloadFile(event) {
    const downloadBtn = event.target.closest('.dowload-btn')
    if (!downloadBtn) return
  
    const url = downloadBtn.dataset.url
    const fileName = downloadBtn.dataset.filename
  
    if (!url || !fileName) return
  
    try {
      const response = await fetch(url)
  
      if (!response.ok) throw new Error('Falha ao baixar o arquivo.')
  
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
  
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = fileName
      anchor.click()
  
      URL.revokeObjectURL(blobUrl)
  
    } catch (error) {
      alert('Erro ao baixar o arquivo. Tente novamente.')
    }
  }

  handleSendMessageFromContact(e) {
    const sendMessageBtn = e.target.closest('.send-message')
    if (!sendMessageBtn) return

    const { contactName, contactEmail, contactPicture } = sendMessageBtn.dataset
    const userData = JSON.parse(LocalStorage.getUserData())

    if (contactEmail === userData.email) {
      alert('Você não pode enviar mensagem para si mesmo.')
      return
    }

    this.#pendingContactData = {
      name: contactName,
      email: contactEmail,
      profilePicture: contactPicture,
    }

    this.#view.toggleConfirmChatModal(this.#pendingContactData)
  }

  async handleConfirmSendMessage() {
    if (!this.#pendingContactData) return

    try {
      const userData = JSON.parse(LocalStorage.getUserData())
      const contact = this.#pendingContactData

      const contactUser = new User({ email: contact.email })
      const contactData = await contactUser.getDocument()

      if (!contactData) {
        alert('Contato não encontrado.')
        this.#view.toggleConfirmChatModal()
        this.#pendingContactData = null
        return
      }

      let chat = await Chat.findByUsers(userData.email, contact.email)
      if (!chat) {
        chat = await Chat.create(userData.email, contact.email)
      }

      const chatId = chat.data.id

      const userA = new User(userData)
      const userB = new User(contactData)

      await userA.saveContact({
        email: contactData.email,
        profilePicture: contactData.profilePicture ?? contactData.picture,
        picture: contactData.picture,
        name: contactData.name,
        chatId,
      })

      await userB.saveContact({
        email: userData.email,
        profilePicture: userData.profilePicture ?? userData.picture,
        picture: userData.picture,
        name: userData.name,
        chatId,
      })

      const freshContacts = await userA.getContactsFromCache(true)
      const sortedContacts = [...freshContacts].sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      await this.#view.loadContacts(sortedContacts, {
        handleCallback: this.handleContactItem.bind(this)
      })

      this.#view.loadContactsModal(sortedContacts, {
        handleCallback: this.handleSendContact.bind(this)
      })

      this.#view.toggleConfirmChatModal()

      const openData = {
        profileImage: contactData.profilePicture ?? contactData.picture,
        name: contactData.name,
        email: contactData.email,
        chatId,
      }

      this.#view.updateMessageScreen(openData)
      this.#view.toggleMessageScreen(true)
      await this.openChat(openData)

      this.#pendingContactData = null

    } catch (error) {
      alert('Erro ao abrir conversa. Tente novamente.')
      throw error
    }
  }

  async handleSendContact(contact) {
    if (!this.#currentChatId) return
  
    try {
      const userData = JSON.parse(LocalStorage.getUserData())
  
      const messageData = {
        type: 'contact-attachment',
        contactName: contact.name,
        contactEmail: contact.email,
        contactPicture: contact.profilePicture ?? contact.picture,
        contactChatId: contact.chatId,
        from: userData.email,
        status: 'wait',
        timeStamp: Date.now(),
      }
  
      const message = new Message(messageData, this.#currentChatId)
      await message.send()
  
      this.handleCloseMediaModal()
  
    } catch (error) {
      alert('Erro ao enviar o contato. Tente novamente.')
    }
  }
}

const appController = new AppController()
window.app = appController
window.app.initEvents()