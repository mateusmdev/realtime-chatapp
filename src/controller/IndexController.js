import IndexView from './../view/IndexView'
import Authenticator from './../firebase/Authenticator'
import LocalStorage from '../utils/LocalStorage'

const BACKGROUND = import.meta.env.VITE_BACKGROUND

class IndexController{
  #view = new IndexView()

  async initEvents(){

    this.#view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.initApp(),
    })

    this.#view.addEvent('#form', {
      eventName: 'submit',
      fn: this.authenticate,
      behavior: {
        preventDefault: true
      }
    })
  }

  initApp() {
    const preferences = {
      backgroundImage: BACKGROUND
    }

    this.#view.initLayout(preferences)
    this.redirectUser()
  }

  redirectUser(){
    const accessToken = LocalStorage.getAccessToken()
    
    if (accessToken) {
      window.location.href = '/app'
    }
  }

  async authenticate(){
    try {
      const auth =  new Authenticator()
      const accessToken = await auth.signIn()

      LocalStorage.setAccessToken(JSON.stringify(accessToken))
      window.location.href = '/app'
    } catch (error) {
      throw error
    }
  }
}

const indexController = new IndexController()
window.app = indexController
window.app.initEvents()