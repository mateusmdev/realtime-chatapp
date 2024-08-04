import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import firebaseConfig from './firebaseConfig'

class Authenticator{
  provider = new GoogleAuthProvider()

  async signIn(){

    try {
      const auth = getAuth(firebaseConfig)
      const result = await signInWithPopup(auth, this.provider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential.accessToken

      if (!result || !token) throw new Error('')

      return token     

    } catch (error) {
      throw error
    }
  }
}

export default Authenticator