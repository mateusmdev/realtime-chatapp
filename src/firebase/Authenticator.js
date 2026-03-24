import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  deleteUser,
  onAuthStateChanged
} from 'firebase/auth'
import firebaseConfig from './firebaseConfig'
import AuthenticationException from '../exception/AuthenticationException'

class Authenticator {
  #provider = new GoogleAuthProvider()

  async signIn(){
    const auth = getAuth(firebaseConfig)
    const result = await signInWithPopup(auth, this.#provider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential.accessToken

    if (!result || !token) throw new AuthenticationException('Failed to obtain access token')

    return token     
  }

  /**
   * Waits for Firebase Auth to restore the session state.
   * Resolves with the current user or null once the state is ready.
   * Avoids the race condition where auth.currentUser is null
   * right after page load even though the user is authenticated.
   * @returns {Promise<import('firebase/auth').User|null>}
   */
  #resolveCurrentUser() {
    return new Promise((resolve) => {
      const auth = getAuth(firebaseConfig)
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  /**
   * Reauthenticates the current user via Google popup.
   * Required by Firebase before sensitive operations like account deletion.
   * Throws AuthenticationException if no user is currently signed in.
   */
  async reauthenticate() {
    const currentUser = await this.#resolveCurrentUser()

    if (!currentUser) {
      throw new AuthenticationException('No authenticated user found for reauthentication.')
    }

    await reauthenticateWithPopup(currentUser, this.#provider)
  }

  /**
   * Deletes the current user account from Firebase Authentication.
   * Reauthenticates first to satisfy Firebase's recent-login requirement.
   * Throws AuthenticationException if no user is currently signed in.
   */
  async deleteAccount() {
    const currentUser = await this.#resolveCurrentUser()

    if (!currentUser) {
      throw new AuthenticationException('No authenticated user found for account deletion.')
    }

    await reauthenticateWithPopup(currentUser, this.#provider)
    await deleteUser(currentUser)
  }
}

export default Authenticator