import firebaseConfig from "./firebaseConfig"
import { getFirestore, getDocs, collection, addDoc, query, where } from 'firebase/firestore'

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
            const isEmpty = !whereParam || (whereParam && where.length < 1)
            const condition = isEmpty ? null : where(...whereParam)
            const queryResult = query(deepRef, condition)
            const result = await getDocs(queryResult)
            return result
        } catch (error) {
            throw error
        }
    }

    async save(data, collectionName){
        try {
            const collectionRef = collection(this._db, collectionName)
            const document = await addDoc(collectionRef, data)
            return document.data()
        } catch (error) {
            throw error
        }
    }

    async update(){

    }

    async delete(){

    }
}

export default Firestore
