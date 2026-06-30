import IndexView from './../view/IndexView'
import Authenticator from './../firebase/Authenticator'
import LocalStorage from '../utils/LocalStorage'
import ProfileCache from '../utils/ProfileCache'
import SystemDocumentManager from '../destroyer/system/SystemDocumentManager'

const BACKGROUND = import.meta.env.VITE_BACKGROUND

class IndexController {
  #view = new IndexView()
  #resetListener = null

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
      return
    }

    this.#initResetListener()
  }

  #initResetListener() {
    let knownResetCount = null

    this.#resetListener = SystemDocumentManager.listenResetCount((resetCount) => {
      if (knownResetCount === null) {
        knownResetCount = resetCount
        return
      }

      if (resetCount !== knownResetCount) {
        LocalStorage.clearSession()
        ProfileCache.clear()
        knownResetCount = resetCount
      }
    })
  }

  #destroyResetListener() {
    if (this.#resetListener) {
      this.#resetListener()
      this.#resetListener = null
    }
  }

  async authenticate() {
    try {
      const auth = new Authenticator()
      const { token, uid } = await auth.signIn()

      LocalStorage.setAccessToken(token)
      LocalStorage.setFirebaseUid(uid)

      window.location.href = '/app'
    } catch (error) {
      throw error
    }
  }
}

const indexController = new IndexController()
indexController.initEvents()