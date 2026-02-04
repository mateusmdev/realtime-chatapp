import IndexView from './../view/IndexView'
import Authenticator from './../firebase/Authenticator'
import LocalStorage from '../utils/LocalStorage'

class IndexController{
  #view = new IndexView()

  async initEvents(){
    const form = this.#view.$('form')

    this.#view.addEvent(document, {
      eventName: 'DOMContentLoaded',
      fn: () => this.redirectUser(),
    })

    this.#view.addEvent(form, {
      eventName: 'submit',
      fn: this.authenticate,
      behavior: {
        preventDefault: true
      }
    })
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