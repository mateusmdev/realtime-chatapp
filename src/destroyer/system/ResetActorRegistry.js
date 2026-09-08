import Firestore from '../../firebase/Firestore'
import LocalStorage from '../../utils/LocalStorage'

const COLLECTION = 'reset_actor'

class ResetActorRegistry {
  #firestore = Firestore.instance

  async ensureResetLockId(email) {
    const cached = LocalStorage.getResetLockId()

    if (cached && !email) return cached
    if (!email) return null

    const normalizedEmail = email.toLowerCase()

    try {
      if (cached) {
        // Não confiar cegamente no cache: o reset_actor correspondente pode já ter
        // sido apagado (ex.: por uma tentativa anterior de exclusão de conta que
        // chegou a rodar delete() aqui, mas falhou depois em outra etapa do fluxo,
        // sem nunca chegar a limpar a sessão local). Sem esta checagem,
        // ResetLockManager.acquireLock() rejeita com "Missing or insufficient
        // permissions" ao gravar um lock_holder_id que não bate com nenhum
        // reset_actor existente para o e-mail autenticado.
        const existing = await this.#firestore.findById(COLLECTION, normalizedEmail)

        if (existing && existing.exists() && existing.data().resetLockId === cached) {
          return cached
        }

        LocalStorage.removeResetLockId()
      }

      const resetLockId = this.#generateId()
      await this.#firestore.save({ resetLockId }, COLLECTION, normalizedEmail)
      LocalStorage.setResetLockId(resetLockId)
      return resetLockId

    } catch (error) {
      console.error('[ResetActorRegistry] Failed to get/create resetLockId.', error)
      return null
    }
  }

  async delete(email) {
    if (!email) return

    try {
      await this.#firestore.delete(COLLECTION, email.toLowerCase())
    } catch (error) {
      console.error('[ResetActorRegistry] Failed to remove resetLockId - not critical.', error)
    } finally {
      // O cache local precisa ser invalidado independentemente do resultado da
      // exclusão remota: se o Firestore falhar, ainda assim não queremos que uma
      // futura sessão reutilize este resetLockId como se o documento existisse.
      LocalStorage.removeResetLockId()
    }
  }

  #generateId() {
    const bytes = crypto.getRandomValues(new Uint8Array(32))
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }
}

export default new ResetActorRegistry()