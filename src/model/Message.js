import AbstractModel from "./AbstractModel"
import Firestore from "../firebase/Firestore"
import { orderBy, serverTimestamp } from "firebase/firestore"

class Message extends AbstractModel {
  #chatId

  static MEDIA_TYPES = ['picture', 'file', 'audio']

  constructor(data = {}, chatId){
    super(data, 'messages', null)
    this.#chatId = chatId
  }

  static #buildLastMessageSnapshot(data) {
    const snapshot = {
      type:        data.type,
      from:        data.from,
      timeStamp:   data.timeStamp,
      content:     null,
      fileName:    null,
      contactName: null,
      encrypted:   data.encrypted === true,
    }

    if (data.encrypted === true) {
      return {
        ...snapshot,
        iv:                 data.iv,
        encryptedContent:   data.encryptedContent,
        encryptedKey:       data.encryptedKey,
        senderKey:          data.senderKey,
        ephemeralPublicKey: data.ephemeralPublicKey,
      }
    }

    switch (data.type) {
      case 'text':
        snapshot.content = data.content ?? null
        break
      case 'file':
        snapshot.fileName = data.fileName ?? null
        break
      case 'contact-attachment':
        snapshot.contactName = data.contactName ?? null
        break
    }

    return snapshot
  }

  async send() {
    const firestore   = this.getModelAttr('firestore')
    const messagePath = `chats/${this.#chatId}/messages`
    const writeData   = { ...this.data, timeStamp: serverTimestamp() }
    const lastMessage = Message.#buildLastMessageSnapshot(writeData)
    const senderEmail = writeData.from.toLowerCase()

    // F4 — a regra canSendMessage() em firestore.rules exige que esta
    // escrita companheira aconteça no MESMO batch; sem ela, a criação da
    // mensagem é rejeitada (getAfter() não veria a atualização).
    await firestore.batchWrite([
      {
        path:       messagePath,
        documentId: null,
        data:       writeData,
      },
      {
        path:       'chats',
        documentId: this.#chatId,
        data:       { lastMessage },
        merge:      true,
      },
      {
        path:       'user',
        documentId: senderEmail,
        data:       { lastMessageAt: serverTimestamp() },
        merge:      true,
      }
    ])
  }

  static async findByChatId(chatId) {
    const firestore   = Firestore.instance
    const path        = `chats/${chatId}/messages`
    const constraints = [orderBy('timeStamp')]

    const result = await firestore.findDocs(path, constraints)

    if (result.empty) return []

    return result.docs.map(docSnap => new Message(docSnap.data(), chatId))
  }

  static async findAllByChatId(chatId) {
    const firestore   = Firestore.instance
    const path        = `chats/${chatId}/messages`
    const constraints = [orderBy('timeStamp')]

    const result = await firestore.findDocs(path, constraints)

    if (result.empty) return []

    return result.docs.map(docSnap => {
      const data     = docSnap.data()
      const hasMedia = Message.MEDIA_TYPES.includes(data.type) && !!data.publicId

      return new Message(
        {
          ...data,
          hasMedia,
          resourceType: hasMedia ? Message.#resolveResourceType(data.type) : null,
        },
        chatId
      )
    })
  }

  static #resolveResourceType(messageType) {
    const map = {
      picture: 'image',
      file:    'raw',
      audio:   'video',
    }
    return map[messageType] ?? 'image'
  }

  static listenByChatId(chatId, callback) {
    const listener    = new Message({}, chatId)
    const path        = `chats/${chatId}/messages`
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