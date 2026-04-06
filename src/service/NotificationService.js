import Firestore from '../firebase/Firestore'
import { orderBy } from 'firebase/firestore'

class NotificationService {
  #userData = null
  #listeners = []
  #initialSnapshots = new Map()
  #queue = []
  #isConsuming = false
  #intervalMs = 800

  static async requestPermission() {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false

    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  init(userData, contacts) {
    this.#userData = userData

    const firestore = Firestore.instance
    const constraints = [orderBy('timeStamp')]

    contacts.forEach(contact => {
      if (!contact.chatId) return

      const chatId = contact.chatId
      const path = `chats/${chatId}/messages`

      this.#initialSnapshots.set(chatId, true)

      const unsubscribe = firestore.onSnapshot(path, null, (snapshot) => {
        this.#handleSnapshot(snapshot, chatId, contact)
      }, constraints)

      this.#listeners.push(unsubscribe)
    })
  }

  destroy() {
    this.#listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') unsubscribe()
    })

    this.#listeners = []
    this.#initialSnapshots = new Map()
    this.#queue = []
    this.#isConsuming = false
    this.#userData = null
  }

  #handleSnapshot(snapshot, chatId, contact) {
    const isInitial = this.#initialSnapshots.get(chatId)

    if (isInitial) {
      this.#initialSnapshots.set(chatId, false)
      return
    }

    const newMessages = snapshot.docChanges()
      .filter(change => change.type === 'added')
      .map(change => change.doc.data())

    newMessages.forEach(data => {
      if (data.from === this.#userData?.email) return
      this.#enqueue(data, contact)
    })
  }

  #enqueue(data, contact) {
    this.#queue.push({ data, contact })
    this.#queue.sort((a, b) => a.data.timeStamp - b.data.timeStamp)

    if (!this.#isConsuming) {
      this.#consume()
    }
  }

  #consume() {
    if (this.#queue.length === 0) {
      this.#isConsuming = false
      return
    }

    this.#isConsuming = true

    const { data, contact } = this.#queue.shift()

    if (!document.hasFocus()) {
      this.showNotification(data, contact)
    }

    setTimeout(() => this.#consume(), this.#intervalMs)
  }

  showNotification(data, contact) {
    const title = contact.name
    const body = this.#resolveBody(data)
    const icon = contact.profilePicture ?? contact.picture ?? undefined

    const notification = new Notification(title, { body, icon })

    notification.addEventListener('click', () => {
      window.focus()
      notification.close()
    })
  }

  #resolveBody(data) {
    const typeMap = {
      'picture': '📷 Imagem',
      'audio': '🎵 Áudio',
      'file': '📄 Arquivo',
      'contact-attachment': '👤 Contato',
    }

    if (typeMap[data.type]) return typeMap[data.type]

    const text = data.content ?? ''
    return text.length > 50 ? `${text.substring(0, 50)}...` : text
  }
}

export default NotificationService