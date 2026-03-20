import AbstractModel from "./AbstractModel"
import Firestore from "../firebase/Firestore"
import { orderBy } from "firebase/firestore"

class Message extends AbstractModel {
  #chatId

  constructor(data = {}, chatId){
    super(data, 'messages', null)
    this.#chatId = chatId
  }

  async send() {
    const documentPath = `chats/${this.#chatId}/messages`
    return await this.getModelAttr('firestore').save(this.data, documentPath, null)
  }

  static async findByChatId(chatId) {
    const firestore = Firestore.instance
    const path = `chats/${chatId}/messages`
    const constraints = [orderBy('timeStamp')]

    const result = await firestore.findDocs(path, constraints)

    if (result.empty) return []

    return result.docs.map(docSnap => new Message(docSnap.data(), chatId))
  }

  static listenByChatId(chatId, callback) {
    const listener = new Message({}, chatId)
    const path = `chats/${chatId}/messages`
    const constraints = [orderBy('timeStamp')]

    listener.onSnapshot((snapshot) => {
      const messages = snapshot.docChanges()
        .filter(change => change.type === 'added')
        .map(change => new Message(change.doc.data(), chatId))

      if (messages.length > 0) callback(messages)
    }, constraints, path)

    return listener
  }
}

export default Message