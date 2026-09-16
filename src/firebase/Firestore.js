import firebaseConfig from "./firebaseConfig"
import {
  getFirestore, getDocs, collection,
  addDoc, query, where, getDoc, doc,
  setDoc, onSnapshot, deleteDoc, writeBatch
} from 'firebase/firestore'

// Firestore batched writes are capped at 500 operations. Mesmo limite usado
// em FirestoreDestroyer#destroyCollection (destroyer/destroyers/FirestoreDestroyer.js).
const DELETE_COLLECTION_BATCH_SIZE = 500

class Firestore {
  _instance = null
  #firebaseInstance = firebaseConfig
  #db = getFirestore()

  static get instance() {
    if (!Firestore._instance) {
      Firestore._instance = new Firestore()
    }
    return Firestore._instance
  }

  async findById(path, documentId) {
    try {
      const documentRef = doc(this.#db, path, documentId)
      const docSnap = await getDoc(documentRef)
      return docSnap
    } catch (error) {
      throw error
    }
  }

  async findDocs(path, constraints = []) {
    try {
      const collectionNames = path.split('/').filter(segment => segment.length > 0)
      const deepRef = collection(this.#db, ...collectionNames)
      const queryResult = query(deepRef, ...constraints)
      const result = await getDocs(queryResult)
      return result
    } catch (error) {
      throw error
    }
  }

  async save(data, path, documentId, options = {}) {
    try {
      const segments = path.split('/').filter(segment => segment.length > 0)
      const collectionRef = collection(this.#db, ...segments)
      const { merge = false } = options

      if (documentId) {
        const documentRef = doc(collectionRef, documentId)

        await setDoc(documentRef, data, { merge })

        const docSnap = await getDoc(documentRef)
        return docSnap
      } else {
        const documentRef = await addDoc(collectionRef, data)
        const docSnap = await getDoc(documentRef)
        return docSnap
      }
    } catch (error) {
      throw error
    }
  }

  onSnapshot(path, documentId, callback, constraints = [], errorCallback = null, options = null) {
    const onError = errorCallback || (error => console.error(`[Firestore Snapshot Error] ${path}/${documentId || ''}:`, error))

    if (documentId) {
      const documentRef = doc(this.#db, path, documentId)
      return options
        ? onSnapshot(documentRef, options, callback, onError)
        : onSnapshot(documentRef, callback, onError)
    }

    const segments = path.split('/').filter(segment => segment.length > 0)
    const collectionRef = collection(this.#db, ...segments)
    const queryRef = query(collectionRef, ...constraints)
    return options
      ? onSnapshot(queryRef, options, callback, onError)
      : onSnapshot(queryRef, callback, onError)
  }

  async update() {}

  async delete(path, documentId) {
    try {
      const segments = path.split('/').filter(segment => segment.length > 0)
      const collectionRef = collection(this.#db, ...segments)
      const documentRef = doc(collectionRef, documentId)
      await deleteDoc(documentRef)
    } catch (error) {
      throw error
    }
  }

  async batchWrite(operations) {
    try {
      const batch = writeBatch(this.#db)

      for (const op of operations) {
        const segments = op.path.split('/').filter(s => s.length > 0)
        const collRef = collection(this.#db, ...segments)
        const ref = op.documentId ? doc(collRef, op.documentId) : doc(collRef)

        op.merge
          ? batch.set(ref, op.data, { merge: true })
          : batch.set(ref, op.data)
      }

      await batch.commit()
    } catch (error) {
      throw error
    }
  }

  async deleteCollection(path) {
    // Antes: Promise.all de deleteDoc individuais — não atômico (uma falha no
    // meio deixa exclusões parciais sem nenhuma indicação de quais docs
    // sobraram) e sem paginação (arriscado para coleções grandes). Agora usa
    // writeBatch em lotes de 500, atômico dentro de cada lote, no mesmo
    // padrão de FirestoreDestroyer (Problema 2 do relatório de investigação).
    try {
      const result = await this.findDocs(path)
      if (result.empty) return

      const docs = result.docs

      for (let i = 0; i < docs.length; i += DELETE_COLLECTION_BATCH_SIZE) {
        const batch     = writeBatch(this.#db)
        const batchDocs = docs.slice(i, i + DELETE_COLLECTION_BATCH_SIZE)

        batchDocs.forEach(docSnap => batch.delete(docSnap.ref))
        await batch.commit()
      }
    } catch (error) {
      throw error
    }
  }
}

export default Firestore