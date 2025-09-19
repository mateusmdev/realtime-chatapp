import Firestore from "./../firebase/Firestore"

class AbstractModel {
    _data = {}
    _primaryKeyProp
    _firestore = Firestore.instance
    _path = null

    constructor(data = {}, documentName, primaryKeyProp) {
      this._data = data
      this._primaryKeyProp = primaryKeyProp
      this._path = documentName

      // if (this._path == null) throw new Error(`The model's name needs to be defined in the child class.`)
    }

    async getDocument() {
      const documentPath = this._path
      const whereCondition = [`${this._primaryKeyProp}`, '==', this._data[this._primaryKeyProp]]
      const query = await this._firestore.findDocs(documentPath, whereCondition)
      const docs = await query.docs
      const isExist = docs && docs.length > 0

      if (isExist){
        const [document] = docs
        return document.data() 
      }

      return null
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