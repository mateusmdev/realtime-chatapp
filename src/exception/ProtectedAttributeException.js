class ProtectedAttributeException extends Error {
  constructor(message = `Modification of attribute is not allowed.`){
    super(message)
    this.name = this.constructor.name
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default ProtectedAttributeException