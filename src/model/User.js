import AbstractModel from "./AbstractModel"

class User extends AbstractModel {
  
  constructor(data = {}){
    super(data, 'user', 'email')
  }

  async findOrCreate(){

      let document = await this.getDocument(this._data)
      
      if (!document) {
        document = await this._firestore.save(this._data, this._path, this._data[this._primaryKeyProp])
      }

      return document
  }

  async saveContact(contactData) {
    const documentPath = `${this._path}/${this._data[this._primaryKeyProp]}/contacts`
    const documentRef = await this._firestore.save(contactData, documentPath, contactData[this._primaryKeyProp])
    
    return documentRef
  }

  async getContacts() {
    const documentPath = `${this._path}/${this._data[this._primaryKeyProp]}/contacts`
    const query = await this._firestore.findDocs(documentPath)
    const docs = await query.docs

    if (docs?.length > 0){
      const data = docs.map(currentDoc => currentDoc.data())
      return data
    }

    return []
  }

  async delete(){

  }

}

export default User
