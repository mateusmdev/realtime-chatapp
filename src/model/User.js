import AbstractModel from "./AbstractModel"

class User extends AbstractModel {
  
  constructor(data = {}){
    super(data, 'user', 'email')
  }

  async saveContact(contactData) {
    const documentPath = `${this.getModelAttr('path')}/${this.data[this.getModelAttr('primaryKeyProp')]}/contacts`
    const documentRef = await this.getModelAttr('firestore').save(contactData, documentPath, contactData[this.getModelAttr('primaryKeyProp')])
    
    return documentRef
  }

  async getContacts() {
    const documentPath = `${this.getModelAttr('path')}/${this.data[this.getModelAttr('primaryKeyProp')]}/contacts`
    const query = await this.getModelAttr('firestore').findDocs(documentPath)
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