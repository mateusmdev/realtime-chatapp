import Firestore from "./../firebase/Firestore"

class AbstractModel {
    _data = {}
    _primaryKeyProp
    _firestore = Firestore.instance
    _path = null
    _listener = null

    constructor(data = {}, documentName, primaryKeyProp) {
      this._data = data
      this._primaryKeyProp = primaryKeyProp
      this._path = documentName

      // if (this._path == null) throw new Error(`The model's name needs to be defined in the child class.`)
    }

    async getDocument(data) {
      const userData = data || this._data
      const documentPath = this._path
      const whereCondition = [`${this._primaryKeyProp}`, '==', userData[this._primaryKeyProp]]
      const query = await this._firestore.findDocs(documentPath, whereCondition)
      const docs = await query.docs
      const isExist = docs && docs.length > 0

      if (isExist){
        const [document] = docs
        return document.data() 
      }

      return null
    }

    async save() {
      const document = await this._firestore.save(this._data, this._path, this._data[this._primaryKeyProp])
      return document
    }

    async onSnapshot(callback) {
      this._listener = this._firestore.onSnapshot(this._path, this._data[this._primaryKeyProp], doc => {
        
        if (!callback || typeof callback !== 'function') throw new Error(`You must pass a callback function when calling 'onSnapshot'`)
        console.log(doc.data())

        this._data = doc.data()
        
          
        callback(doc)
      })
      
      return this._listener
    }

    get data() {
      return this._data
    }

    getAttribute(name){
      const attr = this._data[name]

      if (attr == null) throw Error('Attribute not found.')
      return attr
        
    }

    setAttribute(name, value){
      if (name === 'id' || name === this._primaryKeyProp) throw Error('It is not allowed change this attribute.')

      this._data[name] = value
    }
}

export default AbstractModel