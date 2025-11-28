import Firestore from "./../firebase/Firestore"
import PrimaryKeyException from "../exception/PrimaryKeyException"
import InvalidArgumentException from "../exception/InvalidArgumentException"
import ProtectedAttributeException from "../exception/ProtectedAttributeException"

class AbstractModel {
    #data = {}
    #primaryKeyProp
    #firestore = Firestore.instance
    #path = null
    #listener = null

    constructor(data = {}, documentName, primaryKeyProp) {
      this.#data = data
      this.#primaryKeyProp = primaryKeyProp
      this.#path = documentName
    }

    #validatePrimaryKey() {
        const primaryKeyValue = this.#data[this.#primaryKeyProp]
        if (!primaryKeyValue) {
            throw new PrimaryKeyException(`The primary key ('${property}') is required for this operation.`)
        }
        return primaryKeyValue
    }

    async getDocument(data) {
      const userData = data || this.#data
      const documentPath = this.#path
      
      const primaryKeyValue = userData[this.#primaryKeyProp]
      if (!primaryKeyValue) {
          throw new PrimaryKeyException(`A chave primária ('${this.#primaryKeyProp}') é necessária para buscar o documento.`)
      }

      const query = await this.#firestore.findById(documentPath, this.#data[this.#primaryKeyProp])
      const isExist = query && query?.exists()

      if (isExist){
        const documentData = query.data()
        this.#data = documentData
        
        return documentData
      }

      return null
    }

    async findOrCreate() {

      let document = await this.getDocument(this.data)
      
      if (!document) {
        const firestore = this.getModelAttr('firestore')
        document = await firestore.save(this.data, this.getModelAttr('path'), this.data[this.getModelAttr('primaryKeyProp')])
      }
  
      return document
    }

    async save() {
        const documentId = this.#validatePrimaryKey()

        const document = await this.#firestore.save(this.#data, this.#path, documentId)
        return document?.data()
    }

    async onSnapshot(callback) {
      if (!callback || typeof callback !== 'function') {
         throw new InvalidArgumentException(`You must pass a callback function when calling 'onSnapshot'`)
      }

      const documentId = this.#validatePrimaryKey()

      this.offSnapshot() 
      
      this.#listener = this.#firestore.onSnapshot(this.#path, documentId, doc => {
        
        if (doc && doc.exists()) {
            this.#data = doc.data()
            callback(doc)
        }
      })
      
      return this.#listener
    }

    offSnapshot() {
      if (typeof this.#listener === 'function') {
        this.#listener()
        this.#listener = null
        return true
      }
      return false
    }

    get data() {
      return this.#data
    }

    getModelAttr(name) {
      const dictionary = {
        'firestore': this.#firestore,
        'path': this.#path,
        'primaryKeyProp': this.#primaryKeyProp
      }

      const selectedAttr = dictionary[name]

      if (!selectedAttr) throw new InvalidArgumentException(`This attribute '${name}' does not exist or cannot be accessed.`)

      return selectedAttr
    }

    getAttribute(name) {
      const attr = this.#data[name]

      if (attr == null) throw InvalidArgumentException(`Attribute '${name}' not found.`)
      return attr
    }

    setAttribute(name, value) {
      if (name === 'id' || name === this.#primaryKeyProp) throw ProtectedAttributeException(`Modification of '${name}' attribute is not allowed.`)

      this.#data[name] = value
    }
}

export default AbstractModel