import Firestore from "./../firebase/Firestore"

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
            throw new Error(`A chave primária ('${this.#primaryKeyProp}') deve ser definida para esta operação.`)
        }
        return primaryKeyValue
    }

    async getDocument(data) {
      const userData = data || this.#data
      const documentPath = this.#path
      
      const primaryKeyValue = userData[this.#primaryKeyProp]
      if (!primaryKeyValue) {
          throw new Error(`A chave primária ('${this.#primaryKeyProp}') é necessária para buscar o documento.`)
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

    async save() {
        const documentId = this.#validatePrimaryKey()

        const document = await this.#firestore.save(this.#data, this.#path, documentId)
        return document?.data()
    }

    async onSnapshot(callback) {
      if (!callback || typeof callback !== 'function') {
         throw new Error(`Você deve passar uma função de callback ao chamar 'onSnapshot'`)
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

      if (!selectedAttr) throw new Error(`Este atributo ${name} não existe ou não pode ser acessado.`)

      return selectedAttr
    }

    getAttribute(name) {
      const attr = this.#data[name]

      if (attr == null) throw Error('Atributo não encontrado.')
      return attr
        
    }

    setAttribute(name, value) {
      if (name === 'id' || name === this.#primaryKeyProp) throw Error('Não é permitido alterar este atributo.')

      this.#data[name] = value
    }
}

export default AbstractModel