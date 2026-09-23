import Firestore from '../firebase/Firestore'
import { orderBy } from 'firebase/firestore'

class NotificationService {
  #userData = null
  #cryptoService = null
  #listeners = new Map()
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

  init(userData, contacts, cryptoService = null) {
    this.#userData = userData
    this.#cryptoService = cryptoService
    this.updateContacts(contacts)
  }

  updateContacts(contacts) {
    if (!this.#userData) return

    const firestore = Firestore.instance
    const constraints = [orderBy('timeStamp')]
    const currentChatIds = new Set()

    contacts.forEach(contact => {
      if (!contact.chatId) return

      const chatId = contact.chatId
      currentChatIds.add(chatId)

      if (this.#listeners.has(chatId)) return

      const path = `chats/${chatId}/messages`
      this.#initialSnapshots.set(chatId, true)

      const unsubscribe = firestore.onSnapshot(path, null, (snapshot) => {
        this.#handleSnapshot(snapshot, chatId, contact)
      }, constraints)

      this.#listeners.set(chatId, unsubscribe)
    })

    for (const [chatId, unsubscribe] of this.#listeners.entries()) {
      if (!currentChatIds.has(chatId)) {
        if (typeof unsubscribe === 'function') unsubscribe()
        this.#listeners.delete(chatId)
        this.#initialSnapshots.delete(chatId)
      }
    }
  }

  destroy() {
    this.#listeners.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') unsubscribe()
    })

    this.#listeners.clear()
    this.#initialSnapshots.clear()
    this.#queue = []
    this.#isConsuming = false
    this.#userData = null
    this.#cryptoService = null
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
      if (data.from?.toLowerCase() === this.#userData?.email?.toLowerCase()) return
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

  async #consume() {
    if (this.#queue.length === 0) {
      this.#isConsuming = false
      return
    }

    this.#isConsuming = true

    const { data, contact } = this.#queue.shift()

    let resolvedData = data

    if (data.encrypted === true) {
      if (this.#cryptoService?.isReady) {
        try {
          const plaintext = await this.#cryptoService.decryptMessage(data, false)
          resolvedData = { ...data, content: plaintext }
        } catch (error) {
          console.error('[NotificationService] Failed to decrypt message for notification preview:', error)
          resolvedData = { ...data, content: null }
        }
      }
    }

    if (!document.hasFocus()) {
      this.showNotification(resolvedData, contact)
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
      'picture': '📷 Image',
      'audio': '🎵 Audio',
      'file': '📄 File',
      'contact-attachment': '👤 Contact',
    }

    if (typeMap[data.type]) return typeMap[data.type]

    if (data.encrypted === true && !data.content) {
      return '🔒 Encrypted message'
    }

    const text = data.content ?? ''
    return text.length > 50 ? `${text.substring(0, 50)}...` : text
  }
}

export default NotificationService