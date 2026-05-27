import AbstractModel from "./AbstractModel"
import Firestore from "../firebase/Firestore"
import { where, documentId } from "firebase/firestore"

class Chat extends AbstractModel {
  
  constructor(data = {}){
    super(data, 'chats', null)
  }

  static async findByUsers(emailA, emailB) {
    const firestore = Firestore.instance
    const a = emailA.toLowerCase()
    const b = emailB.toLowerCase()

    const constraints = [
      where('participantEmails', 'array-contains', a),
      where(`users.${btoa(b)}`, '==', true),
    ]

    const result = await firestore.findDocs('chats', constraints)

    if (result.empty) return null

    const docSnap = result.docs[0]
    return new Chat({ ...docSnap.data(), id: docSnap.id })
  }

  static async create(emailA, emailB) {
    const firestore = Firestore.instance
    const a = emailA.toLowerCase()
    const b = emailB.toLowerCase()

    const chatData = {
      users: {
        [btoa(a)]: true,
        [btoa(b)]: true,
      },
      participantEmails: [a, b],
    }
    
    const docSnap = await firestore.save(chatData, 'chats', null)
    return new Chat({ ...docSnap.data(), id: docSnap.id })
  }

  static async findAllByUser(email) {
    const firestore = Firestore.instance
    const e = email.toLowerCase()

    const constraints = [
      where('participantEmails', 'array-contains', e),
    ]

    const result = await firestore.findDocs('chats', constraints)

    if (result.empty) return []

    return result.docs.map(docSnap => new Chat({ ...docSnap.data(), id: docSnap.id }))
  }

  getOtherParticipantEmail(currentUserEmail) {
    const email = currentUserEmail.toLowerCase()
    const users = this.data.users ?? {}
    const otherKey = Object.keys(users).find(key => atob(key).toLowerCase() !== email)
    return otherKey ? atob(otherKey).toLowerCase() : null
  }

  static async deleteChat(chatId) {
    const firestore = Firestore.instance

    const messagesPath = `chats/${chatId}/messages`
    await firestore.deleteCollection(messagesPath)

    await firestore.delete('chats', chatId)
  }

  static listenLastMessages(chatIds, currentUserEmail, callback) {
    if (!chatIds?.length) return []

    const firestore = Firestore.instance
    const BATCH_SIZE = 30
    const unsubscribers = []

    for (let i = 0; i < chatIds.length; i += BATCH_SIZE) {
        const batchIds = chatIds.slice(i, i + BATCH_SIZE)
        const constraints = [
          where(documentId(), 'in', batchIds),
          where('participantEmails', 'array-contains', currentUserEmail.toLowerCase())
        ]

        const unsubscribe = firestore.onSnapshot('chats', null, (snapshot) => {
            const changes = snapshot.docChanges().map(change => ({
                changeType: change.type,
                chatId: change.doc.id,
                data: change.doc.data(),
            }))

            if (changes.length > 0) callback(changes)
        }, constraints)

        unsubscribers.push(unsubscribe)
    }

    return unsubscribers
  }
}

export default Chat