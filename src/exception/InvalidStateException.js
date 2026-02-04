class InvalidStateException extends Error {
  constructor(message = `State is invalid or does not exist.`){
    super(message)
    this.name = this.constructor.name
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default InvalidStateException