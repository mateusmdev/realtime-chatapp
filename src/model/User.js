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

  /**
   * For each contact of the deleted user, updates the corresponding entry
   * in that contact's subcollection marking it as deleted.
   * Must be called before delete() so the contacts list is still available.
   * @param {string} deletedEmail - Email of the user being deleted.
   */
  async markContactAsDeleted(deletedEmail) {
    const contacts = await this.getContacts()

    if (contacts.length === 0) return

    const firestore = this.getModelAttr('firestore')
    const path = this.getModelAttr('path')

    const updatePromises = contacts.map(async contact => {
      const contactEntryPath = `${path}/${contact.email}/contacts`
      const existingEntry = await firestore.findById(contactEntryPath, deletedEmail)

      if (!existingEntry || !existingEntry.exists()) return

      const updatedEntry = {
        ...existingEntry.data(),
        isDeleted: true,
      }

      await firestore.save(updatedEntry, contactEntryPath, deletedEmail)
    })

    await Promise.all(updatePromises)
  }

  async delete() {
    const email = this.data[this.getModelAttr('primaryKeyProp')]
    const firestore = this.getModelAttr('firestore')
    const path = this.getModelAttr('path')

    const tombstone = {
      name: this.data.name,
      isDeleted: true,
      deletedAt: Date.now(),
    }

    await firestore.save(tombstone, path, email)

    const contactsPath = `${path}/${email}/contacts`
    await firestore.deleteCollection(contactsPath)
  }

}

export default User