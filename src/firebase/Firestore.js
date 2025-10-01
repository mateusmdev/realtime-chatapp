import firebaseConfig from "./firebaseConfig"
import { getFirestore, getDocs, collection, addDoc, query, where, getDoc, doc, setDoc, onSnapshot } from 'firebase/firestore'

class Firestore{
    _instance = null
    _firebaseInstance = firebaseConfig
    _db = getFirestore()

    static get instance(){
        if (!Firestore._instance){
            Firestore._instance = new Firestore()
        }

        return Firestore._instance
    }

    async findDocs(path, whereParam = null){
        try {
            const collectionNames = path.split('/')
            const mainRef = collectionNames.shift()
            const deepRef = collection(this._db, mainRef, ...collectionNames)
            const isEmpty = !whereParam || (whereParam && whereParam.length < 1)
            const condition = isEmpty ? null : where(...whereParam)
            const queryResult = query(deepRef, condition)
            const result = await getDocs(queryResult)
            return result
        } catch (error) {
            throw error
        }
    }

    async save(data, collectionName, documentId){
        try {
            const collectionRef = collection(this._db, collectionName)
            
            if (documentId) {
                const document = doc(collectionRef, documentId)
                await setDoc(document, data)
                const docSnap = await getDoc(document)
                return docSnap.data()
                
            } else {
                const document = await addDoc(collectionRef, data)
                const docSnap = await getDoc(document)
                return docSnap.data()
            }
            
        } catch (error) {
            throw error
        }
    }

    async onSnapshot(collectionName, documentId, callback) {
        const document = doc(this._db, collectionName, documentId)
        const listener = onSnapshot(document, callback)
        return listener
    }

    async update(){

    }

    async delete(){

    }
}

export default Firestore
