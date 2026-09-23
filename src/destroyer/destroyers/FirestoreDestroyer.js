import Firestore from '../../firebase/Firestore'
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore'
import '../../firebase/firebaseConfig'

const BATCH_SIZE = 500
const PARENT_CONCURRENCY = 15

class FirestoreDestroyer {
  #db = getFirestore()

  /**
   * @param {string|null} preserveActorEmail - when destroying `reset_actor`, keep this one
   *   document intact. Used to preserve the current reset lock holder's own actor document,
   *   which SystemDocumentManager.reinitialize() still needs a moment later to prove — via the
   *   isLockHolder() Firestore rule — that it is authorized to rotate `_system/crypto`.
   *   DestroyerOrchestrator is responsible for deleting this last document afterwards, once
   *   reinitialize() no longer needs it.
   */
  async destroy(preserveActorEmail = null) {
    const startedAt = Date.now()
    const steps     = []

    steps.push(await this.#destroyChatMessages())
    steps.push(await this.#destroyChats())
    steps.push(await this.#destroyUserContacts())
    steps.push(await this.#destroyUsers())
    steps.push(await this.#destroyResetActors(preserveActorEmail))

    return {
      service:     'firestore',
      status:      this.#resolveStatus(steps),
      steps,
      duration_ms: Date.now() - startedAt,
    }
  }

  async #destroyChatMessages() {
    return this.#destroySubcollections('chats', 'messages', 'chat_messages')
  }

  async #destroyChats() {
    return this.#destroyCollection('chats', 'chats')
  }

  async #destroyUserContacts() {
    return this.#destroySubcollections('user', 'contacts', 'user_contacts')
  }

  async #destroyUsers() {
    return this.#destroyCollection('user', 'users')
  }

  async #destroyResetActors(preserveActorEmail = null) {
    const excludeIds = preserveActorEmail ? [preserveActorEmail.toLowerCase()] : []
    return this.#destroyCollection('reset_actor', 'reset_actors', excludeIds)
  }

  async #destroyCollection(path, stepName, excludeIds = []) {
    let count = 0

    try {
      const collectionRef = collection(this.#db, path)
      const snapshot      = await getDocs(collectionRef)

      if (snapshot.empty) {
        return this.#buildStepResult(stepName, 'SUCCESS', 0, null)
      }

      const docs = excludeIds.length > 0
        ? snapshot.docs.filter(docSnap => !excludeIds.includes(docSnap.id))
        : snapshot.docs

      if (docs.length === 0) {
        return this.#buildStepResult(stepName, 'SUCCESS', 0, null)
      }

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch     = writeBatch(this.#db)
        const batchDocs = docs.slice(i, i + BATCH_SIZE)

        batchDocs.forEach(docSnap => batch.delete(docSnap.ref))
        await batch.commit()

        count += batchDocs.length
      }

      return this.#buildStepResult(stepName, 'SUCCESS', count, null)

    } catch (error) {
      return this.#buildStepResult(stepName, 'FAILURE', count, error)
    }
  }

  async #destroySubcollections(parentPath, subcollectionName, stepName) {
    let count      = 0
    let lastError  = null
    let hasFailure = false

    try {
      const parentRef      = collection(this.#db, parentPath)
      const parentSnapshot = await getDocs(parentRef)

      if (parentSnapshot.empty) {
        return this.#buildStepResult(stepName, 'SUCCESS', 0, null)
      }

      const parentDocs = parentSnapshot.docs

      for (let i = 0; i < parentDocs.length; i += PARENT_CONCURRENCY) {
        const chunk = parentDocs.slice(i, i + PARENT_CONCURRENCY)
        const results = await Promise.all(
          chunk.map(parentDoc => {
            const subcollectionPath = `${parentPath}/${parentDoc.id}/${subcollectionName}`
            return this.#destroyCollection(subcollectionPath, stepName)
          })
        )

        for (const result of results) {
          count += result.count

          if (result.status === 'FAILURE') {
            hasFailure = true
            lastError  = result.error
          }
        }
      }

      const status = hasFailure ? 'FAILURE' : 'SUCCESS'
      return this.#buildStepResult(stepName, status, count, lastError)

    } catch (error) {
      return this.#buildStepResult(stepName, 'FAILURE', count, error)
    }
  }

  #resolveStatus(steps) {
    const hasSuccess = steps.some(s => s.status === 'SUCCESS')
    const hasFailure = steps.some(s => s.status === 'FAILURE')

    if (hasSuccess && hasFailure) return 'PARTIAL_FAILURE'
    if (hasFailure)               return 'FAILURE'
    return 'SUCCESS'
  }

  #buildStepResult(name, status, count, error) {
    return { name, status, count, error }
  }
}

export default new FirestoreDestroyer()