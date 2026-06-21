import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  reauthenticateWithPopup,
  deleteUser,
  onAuthStateChanged
} from 'firebase/auth'
import firebaseConfig from './firebaseConfig'
import AuthenticationException from '../exception/AuthenticationException'

class Authenticator {
  #provider = new GoogleAuthProvider()

  async signIn() {
    const auth = getAuth(firebaseConfig)
    const result = await signInWithPopup(auth, this.#provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential.accessToken

    if (!result || !token) {
      throw new AuthenticationException('Failed to obtain access token')
    }

    return {
      token,
      uid: result.user.uid,
    }
  }

  async signOut() {
    const auth = getAuth(firebaseConfig)
    await firebaseSignOut(auth)
  }

  waitForAuth() {
    return new Promise((resolve) => {
      const auth = getAuth(firebaseConfig)
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  setupAuthStateListener(callback) {
    const auth = getAuth(firebaseConfig)
    return onAuthStateChanged(auth, callback)
  }

  async reauthenticate() {
    const currentUser = await this.waitForAuth()

    if (!currentUser) {
      throw new AuthenticationException('No authenticated user found for reauthentication.')
    }

    await reauthenticateWithPopup(currentUser, this.#provider)
  }

  async deleteAccount() {
    const currentUser = await this.waitForAuth()

    if (!currentUser) {
      throw new AuthenticationException('No authenticated user found for account deletion.')
    }

    await reauthenticateWithPopup(currentUser, this.#provider)
    await deleteUser(currentUser)
  }

  async finalizeAccountDeletion() {
    const currentUser = await this.waitForAuth()

    if (!currentUser) {
      throw new AuthenticationException('No authenticated user found for account deletion.')
    }

    await deleteUser(currentUser)
  }
}

export default Authenticator