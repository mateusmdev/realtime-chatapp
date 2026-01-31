import ProfileCache from "../utils/ProfileCache"
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
    const docs = query.docs ?? []

    if (docs.length === 0) return []

    const contacts = docs.map(doc => doc.data())
    return contacts
  }

  async getContactsFromCache(updateCache = false) {
    const contacts = await this.getContacts()
    const cacheObject = ProfileCache.get()
    const cache = cacheObject?.cache || []

    if (updateCache === false && cache.length === contacts.length) {
      return cache
    }
    
    const enrichedContacts = await Promise.all(
      contacts.map(async contact => {
        const user = new User({ email: contact.email })
        const freshData = await user.getDocument()
        
        return {
          ...contact,
          about: freshData?.about ?? ''
        }
      })
    )
    
    ProfileCache.set(enrichedContacts)
    return enrichedContacts
  }

  async delete(){

  }

}

export default User