class InvalidArgumentException extends Error {
  constructor(message = `One or more of the arguments provided are invalid.`){
    super(message)
    this.name = this.constructor.name
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default InvalidArgumentException