import firebaseConfig from "./firebaseConfig"
import { 
    getFirestore, getDocs, collection, 
    addDoc, query, where, getDoc, doc, 
    setDoc, onSnapshot 
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

    async save(data, collectionName, documentId){
        try {
            const collectionRef = collection(this.#db, collectionName)
            
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

    async onSnapshot(collectionName, documentId, callback) {
        const documentRef = doc(this.#db, collectionName, documentId)
        const listener = onSnapshot(documentRef, callback)
        return listener
    }

    async update(){

    }

    async delete(){

    }
}

export default Firestore