import firebaseConfig from "./firebaseConfig"
const { getFirestore, getDocs, collection, addDoc, query, where } = require('firebase/firestore')

class Firestore{
    _firebaseInstance = firebaseConfig
    _db = getFirestore()

    async findDoc(path, whereParam){
        try {
            const collectionNames = path.split('/')
            const mainRef = collectionNames.shift()
            const deepRef = collection(this._db, mainRef, ...collectionNames)
            const condition = whereParam.length > 0 ? where(...whereParam) : null
            const queryResult = query(deepRef, condition)
            const result = await getDocs(queryResult)
            return result
        } catch (error) {
            throw error
        }
    }

    async save(data){
        try {
            
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