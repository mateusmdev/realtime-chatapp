import NotImplementedException from "../exception/NotImplementedException"

class IMediaStrategy {
  execute() {
    throw new NotImplementedException()
  }
}

export default IMediaStrategy