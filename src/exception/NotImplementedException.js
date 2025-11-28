class NotImplementedException extends Error {
  constructor(message = `Method need to be implemented.`){
    super(message)
    this.name = this.constructor.name
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export default NotImplementedException