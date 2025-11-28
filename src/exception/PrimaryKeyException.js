class PrimaryKeyException extends Error {
  constructor(message = `The primary key is required for this operation.`){
    super(message)
    this.name = this.constructor.name
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default PrimaryKeyException