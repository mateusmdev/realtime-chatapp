import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
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
}

export default Authenticator