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
    const { takeScreenshotBtn, sendPictureBtn, sendDocumentBtn, sendContactBtn } = this.view.el
    const { uploadFile } = this.view.el
    const { messageScreen } = this.view.el
    const { emojiList } = this.view.el
    const { mediaBar } = this.view.el
    
    
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
      fn: (e) => this.view.toggleEmojiModal(),
      preventDefault: true,
      stopPropagation: true
    })

    this.view.addEvent(attachmentBtn, {
      eventName: 'click',
      fn: () => this.view.toggleMediaBar(),
      preventDefault: true,
      stopPropagation: true
    })

    this.view.addEventAll([takeScreenshotBtn, sendPictureBtn, sendDocumentBtn, sendContactBtn], {
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
      fn: (e) => {
        // console.log('Target', e.target)
        // console.log('Current Target', e.currentTarget)

        if (e.target === e.currentTarget) return

        const iconElement = e.target
        // console.log(iconElement.innerText)
      },
      preventDefault: false,
      stopPropagation: true
    })
  }

  initApp(){
    this.view.state.blockMedia = BLOCK_MEDIA || true
    
    if (typeof this.view.state.blockMedia === 'string') {
      this.view.state.blockMedia = JSON.parse(this.view.state.blockMedia)
    }
    
    // this.getUserData()
    this.getIconData()
    this.view.initLayout()
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
      const user = new User(data);
      const result = await user.findOrCreate()
      this.view.setUserContent(result)

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
    localStorage.clear()
    window.location.href = '/'
  }

  handleMenuBtnClick(e){
    this.view.changeSection(e.currentTarget)
  }

  handleMessageItem(e){
    this.view.messageScreenToggle()
    const isCorrectTarget = e.currentTarget.id === 'back-btn'
    
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


      case 'take-screenshot-btn':
        if (this.view.state.blockMedia === true) {
          blockMessage()
          return
        }

        break
        
        case 'send-picture-btn':
          if (this.view.state.blockMedia === true) {
            blockMessage()
            return
          }

          break
    }
  }
  
  async handleChangeInputFile(e) {
    const id = 'send-document-btn'
    const [uploadedFile] = e.target.files
    const { pdfArea, fileArea } = this.view.el
    const isPdf = uploadedFile.type === 'application/pdf'
    
    const mediaInstance = MediaFactory.getInstance(id)
    const mediaHandler = new MediaContext(mediaInstance)
    const uploadData = { 
      file: uploadedFile,
      area: isPdf ? pdfArea : fileArea
    }

    const modalType = isPdf ? 'pdf-preview' : 'documents'
    await mediaHandler.execute(uploadData)
    this.view.toggleMediaModal(true, modalType)
    this.view.setDefaultMode()
  }
}

const appController = new AppController()
window.app = appController
window.app.initEvents()