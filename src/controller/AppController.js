import AppView from './../view/AppView'
import axios from 'axios'
import LocalStorage from '../utils/LocalStorage'
import User from '../model/User'

const TOKEN_VALIDATOR = import.meta.env.VITE_TOKEN_VALIDATOR

class AppController{
  view = new AppView()

  async initEvents(){
    const logoutBtn = this.view.el.exitBtn
    const { chatMenuBtn, contactMenuBtn, settingMenuBtn } = this.view.el
    const { backBtn } = this.view.el
    const { addContactBtn, cancelAddContact } = this.view.el
    
    
    this.view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.getUserData(),
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

  signOut(){
    localStorage.clear()
    window.location.href = '/'
  }

  handleMenuBtnClick(e){
    this.view.changeSection(e.currentTarget)
  }

  handleMessageItem(){
    this.view.messageScreenToggle()
  }
}

const appController = new AppController()
window.app = appController
window.app.initEvents()