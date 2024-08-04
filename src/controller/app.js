import AppView from './../view/appView'
import axios from 'axios'
import LocalStorage from '../utils/localStorage'

const TOKEN_VALIDATOR = import.meta.env.VITE_TOKEN_VALIDATOR

class AppController{
  view = new AppView()

  async initEvents(){
    const logoutBtn = this.view.el.exitBtn

    this.view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.getUserData(),
    })

    this.view.addEvent(logoutBtn, {
      eventName: 'click',
      fn: () => this.signOut(),
      preventDefault: true
    })
  }

  async getUserData(){
    const acessToken = LocalStorage.getAcessToken()

    if (!acessToken) {
      window.location.href = '/'
    }

    try {
      console.log('passou aqui1')
      const response = await axios.get(TOKEN_VALIDATOR, {
        headers: {
        ' Authorization': `Bearer ${acessToken}`
        }
      });

      const { data } = response
      this.view.setUserContent(data)

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
}

const appController = new AppController()
window.app = appController
window.app.initEvents()