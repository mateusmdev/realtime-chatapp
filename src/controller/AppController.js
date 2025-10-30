import AppView from './../view/AppView'
import axios from 'axios'
import LocalStorage from '../utils/LocalStorage'
import User from '../model/User'
import MediaContext from './../model/MediaContext'
import MediaFactory from '../model/MediaFactory'

const TOKEN_VALIDATOR = import.meta.env.VITE_TOKEN_VALIDATOR
const ICON_KEY = import.meta.env.VITE_ICON_KEY
const BLOCK_MEDIA = import.meta.env.VITE_BLOCK_MEDIA

class AppController{
  view = new AppView()

  async initEvents(){
    const logoutBtn = this.view.el.exitBtn
    const { chatMenuBtn, contactMenuBtn, settingMenuBtn } = this.view.el
    const { backBtn } = this.view.el
    const { addContactBtn, cancelAddContact } = this.view.el
    const { emojiModalBtn } = this.view.el
    const { attachmentBtn, closeMediaModalBtn} = this.view.el
    const { takePhotoBtn, sendPictureBtn, sendDocumentBtn, sendContactBtn } = this.view.el
    const { uploadFile } = this.view.el
    const { messageScreen } = this.view.el
    const { emojiList } = this.view.el
    const { mediaBar } = this.view.el
    const { userNameContent, userAboutContent } = this.view.el
    const { changeImgBtn, profileImageFile } = this.view.el
    const { inputContent, placeholder, sendBtn } = this.view.el
    const { insertContactBtn, contactInput } = this.view.el
    const { takePhotoActionBtn } = this.view.el
    
    
    this.view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.initApp(),
    })

    this.view.addEvent(logoutBtn, {
      eventName: 'click',
      fn: () => this.signOut(),
      preventDefault: true
    })

    this.view.addEventAll([chatMenuBtn, contactMenuBtn, settingMenuBtn], {
      eventName: 'click',
      fn: (e) => this.handleMenuBtnClick(e),
      preventDefault: true
    })

    this.view.addEventAll('.item', {
      eventName: 'click',
      fn: (e) => this.handleMessageItem(e),
      preventDefault: true
    })

    this.view.addEvent(backBtn, {
      eventName: 'click',
      fn: (e) => this.handleMessageItem(e),
      preventDefault: true
    })

    this.view.addEventAll([addContactBtn, cancelAddContact], {
      eventName: 'click',
      fn: (e) => this.view.setAddContactModal(e.currentTarget),
      preventDefault: true
    })

    this.view.addEvent(emojiModalBtn, {
      eventName: 'click',
      fn: (event) => this.view.toggleEmojiModal(event),
      preventDefault: true,
      stopPropagation: true
    })

    this.view.addEvent(attachmentBtn, {
      eventName: 'click',
      fn: () => this.view.toggleMediaBar(),
      preventDefault: true,
      stopPropagation: true
    })

    this.view.addEventAll([takePhotoBtn, sendPictureBtn, sendDocumentBtn, sendContactBtn], {
      eventName: 'click',
      fn: (e) => this.handleMediaButton(e),
      preventDefault: true,
      stopPropagation: true
    })

    this.view.addEvent(closeMediaModalBtn, {
      eventName: 'click',
      fn: () => this.handleCloseMediaModal(false),
      preventDefault: true
    })

    this.view.addEvent(uploadFile, {
      eventName: 'change',
      fn: (e) => this.handleChangeInputFile(e),
      preventDefault: false
    })

    this.view.addEvent(messageScreen, {
      eventName: 'click closeModal',
      fn: (e) => this.view.setDefaultMode(e),
      preventDefault: false,
      stopPropagation: true
    })
    
    this.view.addEvent(mediaBar, {
      eventName: 'click',
      fn: (e) => e.stopPropagation(),
      preventDefault: false,
    })

    this.view.addEvent(emojiList, {
      eventName: 'click',
      fn: (event) => this.view.addEmoji(event),
      preventDefault: false,
      stopPropagation: true
    })
    
    this.view.addEventAll([userNameContent, userAboutContent], {
      eventName: 'keypress blur',
      fn: (e) => this.view.setUserContent(e)
    })

    this.view.addEvent(changeImgBtn, {
      eventName: 'click',
      fn: (e) => profileImageFile.click(),
      preventDefault: true,
    })

    this.view.addEvent(profileImageFile, {
      eventName: 'change',
      fn: (e) => this.handleProfileImageFile(e),
      preventDefault: false
    })

    this.view.addEvent(inputContent, {
      eventName: 'keyup',
      fn: (e) => this.view.toggleMessagePlaceholder(e),
      preventDefault: false
    })

    this.view.addEvent(inputContent, {
      eventName: 'keypress',
      fn: (e) => this.handleSendMessage(e),
      preventDefault: false
    })

    this.view.addEvent(sendBtn, {
      eventName: 'click',
      fn: (e) => {
        const { messageList, inputContent } = this.view.el
        const messageLength = inputContent.innerText.trim().length

        if (messageLength > 0) {
          const message = this.view.createElement('li', messageList, {
            class: 'message user',
          })
  
          const content = this.view.createElement('div', message, {
            class: 'content text',
            innerText: inputContent.innerText
          })
  
          const event = new CustomEvent('keyup', {
            bubbles: false,
            cancelable: true,
            composed: false
          })
  
          inputContent.textContent = ''
          inputContent.dispatchEvent(event)
        }
      },
      preventDefault: true
    })

    this.view.addEvent(inputContent, {
      eventName: 'mouseup',
      fn: (event) => this.view.setSelection(event),
      preventDefault: false
    })

    this.view.addEventAll([userNameContent, userAboutContent], {
      eventName: 'saveData',
      fn: (event) => this.handleUpdateUserData(event),
      preventDefault: true
    })

    this.view.addEvent(insertContactBtn, {
      eventName: 'click',
      fn: (event) => this.handleAddContact(event),
      preventDefault: true
    })

    this.view.addEvent('.custom-input button', {
      eventName: 'click',
      fn: (event) => this.handleToggleStyle(event),
      preventDefault: false,
    })

    this.view.addEvent(takePhotoActionBtn, {
      eventName: 'click',
      fn: async (event) => {
        //It is necessary to implement this feature.
      },
      preventDefault: true,
    })
  }

  async initApp(){
    this.view.state.blockMedia = BLOCK_MEDIA || false
    
    if (typeof this.view.state.blockMedia === 'string') {
      this.view.state.blockMedia = JSON.parse(this.view.state.blockMedia)
    }

    const preferences = JSON.parse(LocalStorage.getUserPreferences()) || {}
    
    this.getUserData()
    await this.getIconData()
    await this.view.initLayout(preferences)
  }

  async getUserData(){
    const acessToken = LocalStorage.getAcessToken()

    if (!acessToken) {
      window.location.href = '/'
    }

    try {
      const response = await axios.get(TOKEN_VALIDATOR, {
        headers: {
        ' Authorization': `Bearer ${acessToken}`
        }
      });

      const { data } = response

      const user = new User({
        ...data,
        profilePicture: data.picture,
        about: 'I am using Realtime Chat App',
      });

      await user.findOrCreate()
      const contacts = await user.getContacts()
      
      await user.onSnapshot(() => {
        LocalStorage.setUserData(JSON.stringify(user.data))
        this.view.loadUserContent(user.data)
      })

      const options = {
        handleCallback: this.handleContactItem.bind(this)
      }

      await this.view.loadContacts(contacts, options)

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
    
    this.view.loadEmoji(iconList)
  }

  signOut(){
    LocalStorage.clearSession()
    window.location.href = '/'
  }

  handleMenuBtnClick(e){
    this.view.changeSection(e.currentTarget)
  }
  
  handleContactItem(e, data) {
    const isCorrectTarget = e.currentTarget.id === 'back-btn'
    this.view.updateMessageScreen(data)
    this.view.toggleMessageScreen(!isCorrectTarget)
    
    if (isCorrectTarget){
      this.view.toggleMediaModal(false)
    }
  }

  handleMessageItem(e){
    const isCorrectTarget = e.currentTarget.id === 'back-btn'
    this.view.toggleMessageScreen(!isCorrectTarget)
    
    if (isCorrectTarget){
      this.view.toggleMediaModal(false)
    }
  }

  handleCloseMediaModal(){
    this.view.toggleMediaModal(false)
  }

  handleMediaButton(e) {
    const { id } = e.currentTarget
    const { uploadFile } = this.view.el

    this.view.state.mediaButtonId = id

    const blockMessage = () => {
      alert('This feature is not allowed on my server. Run the project on your machine and enable it for use.')
    }

    switch(id) {
      case 'send-contact-btn':
        this.view.toggleMediaModal(true, 'list-contact')
        break

      case 'send-document-btn':
        if (this.view.state.blockMedia === true) {
          blockMessage()
          return
        }

        uploadFile.click()
        break


      case 'take-photo-btn':
        if (this.view.state.blockMedia === true) {
          blockMessage()
          return
        }

        this.view.toggleMediaModal(true, 'take-photo')
        break
        
        case 'send-picture-btn':
          if (this.view.state.blockMedia === true) {
            blockMessage()
            return
          }

          uploadFile.click()
          break
    }
  }
  
  async handleChangeInputFile(e) {
    const id = this.view.state.mediaButtonId
    const [uploadedFile] = e.target.files
    const { pdfArea, fileArea, sentImagePreview, sentImageName } = this.view.el

    if (!uploadedFile) alert('Could not open this file.')

    const isPdf = uploadedFile.type === 'application/pdf'
    const componentData = {} 

    if (uploadedFile.type.startsWith('image/') && id === 'send-document-btn') {
      componentData.selectedArea = fileArea
      componentData.modalClass = 'documents'
      
    } else if (uploadedFile.type.startsWith('image/') && id === 'send-picture-btn') {
      componentData.selectedArea = {
        image: sentImagePreview,
        name: sentImageName
      }

      componentData.modalClass = 'image-preview'
      
    } else if (isPdf) {
      componentData.selectedArea = pdfArea
      componentData.modalClass = 'pdf-preview'
      
    } else {
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

    await this.view.toggleMediaModal(true, componentData.modalClass)
    this.view.setDefaultMode()
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
      const { sendBtn } = this.view.el
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
    const value = this.view.el.contactInput.value
    const userData = JSON.parse(LocalStorage.getUserData())

    if (value.trim() === '' || value.trim() === userData.email) return

    const contact = new User({ email : contactInput.value })
    const result = await contact.getDocument()

    if (result !== null) {
      try {
        const user = new User( userData )
        await user.saveContact({ 
          email : result.email,
          profilePicture: result.profilePicture,
          picture: result.picture,
          about: result.about,
          name: result.name
        })

      } catch (error) {
        throw error
      }
    }

    this.view.setAddContactModal(this.view.el.cancelAddContact)
  }

  async handleToggleStyle(event) {
    let preferences = JSON.parse(LocalStorage.getUserPreferences()) ?? {}

    const appStyle = this.view.state.appStyle === 'circle' ? 'square' : 'circle'
    this.view.state.appStyle = appStyle
    
    preferences = {
      ...preferences,
      appStyle: this.view.state.appStyle
    }
    
    LocalStorage.setUserPreferences(JSON.stringify(preferences))
    this.view.setAppStyle()
  }
}

const appController = new AppController()
window.app = appController
window.app.initEvents()