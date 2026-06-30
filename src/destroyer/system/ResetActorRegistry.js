import Firestore from '../../firebase/Firestore'
import LocalStorage from '../../utils/LocalStorage'

const COLLECTION = 'reset_actor'

class ResetActorRegistry {
  #firestore = Firestore.instance

  async ensureResetLockId(email) {
    const cached = LocalStorage.getResetLockId()
    if (cached) return cached

    if (!email) return null

    const normalizedEmail = email.toLowerCase()

    try {
      const existing = await this.#firestore.findById(COLLECTION, normalizedEmail)

      if (existing && existing.exists()) {
        const resetLockId = existing.data().resetLockId
        LocalStorage.setResetLockId(resetLockId)
        return resetLockId
      }

      const resetLockId = this.#generateId()
      await this.#firestore.save({ resetLockId }, COLLECTION, normalizedEmail)
      LocalStorage.setResetLockId(resetLockId)
      return resetLockId

    } catch (error) {
      console.error('[ResetActorRegistry] Falha ao obter/criar resetLockId.', error)
      return null
    }
  }

  async delete(email) {
    if (!email) return

    try {
      await this.#firestore.delete(COLLECTION, email.toLowerCase())
    } catch (error) {
      console.error('[ResetActorRegistry] Falha ao remover resetLockId — não é crítico.', error)
    }
  }

  #generateId() {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

export default new ResetActorRegistry()