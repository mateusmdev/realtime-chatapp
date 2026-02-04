class AuthenticationException extends Error {
  constructor(message = `Authentication failed and no access token was returned.`){
    super(message)
    this.name = this.constructor.name
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default AuthenticationException