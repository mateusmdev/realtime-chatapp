import AppView from './../view/AppView'
import axios from 'axios'
import LocalStorage from '../utils/LocalStorage'
import User from '../model/User'
import MediaContext from './../model/MediaContext'
import MediaFactory from '../model/MediaFactory'
import MediaDataSingleton from '../model/MediaDataSingleton'

const TOKEN_VALIDATOR = import.meta.env.VITE_TOKEN_VALIDATOR
const ICON_KEY = import.meta.env.VITE_ICON_KEY

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
    
    
    this.view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.getData(),
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
      preventDefault: true
    })

    this.view.addEvent(attachmentBtn, {
      eventName: 'click',
      fn: () => this.view.toggleMediaBar(),
      preventDefault: true
    })

    this.view.addEventAll([takeScreenshotBtn, sendPictureBtn, sendDocumentBtn, sendContactBtn], {
      eventName: 'click',
      fn: (e) => this.handleMediaButton(e),
      preventDefault: true
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
  }

  getData(){
    this.getUserData()
    this.getIconData()
  }

  async getUserData(){
    const acessToken = LocalStorage.getAcessToken()

    if (!acessToken) {
      // window.location.href = '/'
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
      // window.location.href = '/'
      // throw error
    }
  }

  async getIconData(){
    let iconList = LocalStorage.getIconList()
    
    if (!iconList) {
      console.log('here')
      const response = await axios.get(`https://emoji-api.com/emojis?access_key=${ICON_KEY}`);
      
      iconList = response.data
      LocalStorage.setIconList(JSON.stringify(iconList))
    }
    
    if (typeof iconList === 'string') iconList = JSON.parse(iconList)

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
    console.log(id, e.target)

    // this.view.toggleMediaModal()
    if (id === 'send-document-btn') {
      uploadFile.click()
      return
    }

    // const singletonInstance = MediaDataSingleton.getInstance()
    // singletonInstance.setInputFile(this.view.el.uploadFile)
    // console.log('aqui: ', this.view.el.uploadFile)

    // const mediaInstance = MediaFactory.getInstance(id)
    // console.log('SelectedInstancia: ', mediaInstance)
    // const mediaHandler = new MediaContext(mediaInstance)

    // mediaHandler.execute()
  }

  handleChangeInputFile(e) {
    console.log('Event: ', e)
    console.log('Files: ', e.target.files)
    const id = 'send-document-btn'
    const [uploadedFile] = e.target.files
    // const singletonInstance = MediaDataSingleton.getInstance()
    // singletonInstance.setFiles(e.target.files)

    const mediaInstance = MediaFactory.getInstance(id)
    console.log('SelectedInstancia: ', mediaInstance)
    const mediaHandler = new MediaContext(mediaInstance)

    mediaHandler.execute(uploadedFile)
  }
}

const appController = new AppController()
window.app = appController
window.app.initEvents()