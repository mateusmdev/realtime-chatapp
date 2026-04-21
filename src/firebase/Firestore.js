import firebaseConfig from "./firebaseConfig"
import { 
    getFirestore, getDocs, collection, 
    addDoc, query, where, getDoc, doc, 
    setDoc, onSnapshot, deleteDoc, writeBatch
} from 'firebase/firestore'

class Firestore{
    _instance = null
    #firebaseInstance = firebaseConfig
    #db = getFirestore()

    static get instance(){
        if (!Firestore._instance){
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

    async save(data, path, documentId){
        try {
            const segments = path.split('/').filter(segment => segment.length > 0)
            const collectionRef = collection(this.#db, ...segments)
            
            if (documentId) {
                const documentRef = doc(collectionRef, documentId)
                await setDoc(documentRef, data)
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

    async update(){

    }

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