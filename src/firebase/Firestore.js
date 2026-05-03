/**
 * Firestore.js — versão atualizada
 *
 * ÚNICA MUDANÇA em relação à versão original:
 * O método save() agora aceita um quarto argumento `options`
 * com suporte ao flag `merge: true`.
 *
 * Com merge:true, o Firestore atualiza APENAS os campos fornecidos,
 * preservando todos os outros campos do documento.
 * Sem merge (comportamento original), o documento é sobrescrito.
 *
 * Isso corrige o risco de race condition e perda de dados quando
 * dois processos atualizam o mesmo documento simultaneamente.
 */

import firebaseConfig from "./firebaseConfig"
import {
  getFirestore, getDocs, collection,
  addDoc, query, where, getDoc, doc,
  setDoc, onSnapshot, deleteDoc, writeBatch
} from 'firebase/firestore'

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

  /**
   * Salva dados no Firestore.
   *
   * @param {object} data
   * @param {string} path
   * @param {string|null} documentId
   * @param {object} [options]
   * @param {boolean} [options.merge=false] - Se true, faz merge incremental.
   *   Campos existentes no documento que não estejam em `data` são preservados.
   *   Se false (padrão), o documento é sobrescrito (comportamento original).
   *
   * @returns {Promise<DocumentSnapshot>}
   */
  async save(data, path, documentId, options = {}) {
    try {
      const segments = path.split('/').filter(segment => segment.length > 0)
      const collectionRef = collection(this.#db, ...segments)
      const { merge = false } = options

      if (documentId) {
        const documentRef = doc(collectionRef, documentId)

        // merge:true preserva campos existentes — essencial para atualização
        // parcial sem sobrescrever dados não relacionados (ex.: name, about)
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

  onSnapshot(path, documentId, callback, constraints = []) {
    if (documentId) {
      const documentRef = doc(this.#db, path, documentId)
      return onSnapshot(documentRef, callback)
    }

    const segments = path.split('/').filter(segment => segment.length > 0)
    const collectionRef = collection(this.#db, ...segments)
    const queryRef = query(collectionRef, ...constraints)
    return onSnapshot(queryRef, callback)
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
    try {
      const result = await this.findDocs(path)
      if (result.empty) return

      const deletePromises = result.docs.map(docSnap => deleteDoc(docSnap.ref))
      await Promise.all(deletePromises)
    } catch (error) {
      throw error
    }
  }
}

export default Firestore