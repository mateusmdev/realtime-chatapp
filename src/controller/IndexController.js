import IndexView from './../view/IndexView'
import Authenticator from './../firebase/Authenticator'
import LocalStorage from '../utils/LocalStorage'
import ProfileCache from '../utils/ProfileCache'
import SystemDocumentManager from '../destroyer/system/SystemDocumentManager'

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
      fn: () => this.authenticate(),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEvent('#termsBtn', {
      eventName: 'click',
      fn: () => this.#view.toggleUserTermsModal(true),
      behavior: {
        preventDefault: true
      }
    })
    
    this.#view.addEvent('#closeTermsBtn', {
      eventName: 'click',
      fn: (event) => this.#view.toggleUserTermsModal(false),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEventAll('.term-btn', {
      eventName: 'click',
      fn: (event) => this.#view.setTermsModal(event.target),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEvent('#termToggle', {
      eventName: 'change',
      fn: (event) => this.#view.toggleTermBlock(),
      behavior: {
        preventDefault: true
      }
    })

    this.#view.addEvent('#enterPreviewBtn', {
      eventName: 'click',
      fn: (event) => window.location.href = '/app?mode=preview',
      behavior: {
        preventDefault: true
      }
    })
  }

  initApp() {
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
      const wasAccepted = this.#view.validateUseTerms()

      if (wasAccepted === true) {
        const auth = new Authenticator()
        const { token, uid } = await auth.signIn()

        LocalStorage.setAccessToken(token)
        LocalStorage.setFirebaseUid(uid)
        LocalStorage.setPendingTermsAcceptance()

        window.location.href = '/app'
      }
    } catch (error) {
      console.error('[IndexController] Failed to authenticate user:', error)
    }
  }
}

const indexController = new IndexController()
indexController.initEvents()