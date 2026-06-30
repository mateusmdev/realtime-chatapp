import ProfileCache from "../utils/ProfileCache"
import AbstractModel from "./AbstractModel"

class User extends AbstractModel {

  static ALLOWED_FIELDS = [
    'name', 'email', 'picture', 'profilePicture', 'about',
    'isDeleted', 'deletedAt', 'publicKey', 'encryptedPrivateKey',
  ]

  static sanitize(data = {}) {
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => User.ALLOWED_FIELDS.includes(key))
    )
  }

  constructor(data = {}){
    if (data.email) {
      data.email = data.email.toLowerCase()
    }
    super(data, 'user', 'email')
  }

  async saveContact(contactData) {
    if (contactData.email) {
      contactData.email = contactData.email.toLowerCase()
    }
    const documentPath = `${this.getModelAttr('path')}/${this.data[this.getModelAttr('primaryKeyProp')]}/contacts`
    const documentRef = await this.getModelAttr('firestore').save(contactData, documentPath, contactData[this.getModelAttr('primaryKeyProp')])

    return documentRef
  }

  async getContacts() {
    const documentPath = `${this.getModelAttr('path')}/${this.data[this.getModelAttr('primaryKeyProp')]}/contacts`
    const query = await this.getModelAttr('firestore').findDocs(documentPath)
    const docs = query.docs ?? []

    if (docs.length === 0) return []

    const contacts = docs.map(doc => {
      const data = doc.data()
      if (data.email) data.email = data.email.toLowerCase()
      return data
    })
    return contacts
  }

  async getContactsFromCache(updateCache = false) {
    const contacts    = await this.getContacts()
    const cacheObject = ProfileCache.get()
    const cache       = cacheObject?.cache || []

    if (updateCache === false && cache.length === contacts.length) {
      return cache
    }

    const enrichedContacts = await Promise.all(
      contacts.map(async contact => {
        const user      = new User({ email: contact.email.toLowerCase() })
        const freshData = await user.getDocument()

        return {
          ...contact,
          email:     contact.email.toLowerCase(),
          about:     freshData?.about     ?? '',
          publicKey: freshData?.publicKey ?? null,
        }
      })
    )

    ProfileCache.set(enrichedContacts)
    return enrichedContacts
  }

  async markContactAsDeleted(deletedEmail) {
    const email    = deletedEmail.toLowerCase()
    const contacts = await this.getContacts()

    if (contacts.length === 0) return

    const firestore = this.getModelAttr('firestore')
    const path      = this.getModelAttr('path')

    const updatePromises = contacts.map(async contact => {
      const contactEmail     = contact.email.toLowerCase()
      const contactEntryPath = `${path}/${contactEmail}/contacts`
      const existingEntry    = await firestore.findById(contactEntryPath, email)

      if (!existingEntry || !existingEntry.exists()) return

      const updatedEntry = {
        ...existingEntry.data(),
        email:     email,
        isDeleted: true,
      }

      await firestore.save(updatedEntry, contactEntryPath, email)
    })

    await Promise.all(updatePromises)
  }

  async delete() {
    const email     = this.data[this.getModelAttr('primaryKeyProp')].toLowerCase()
    const firestore = this.getModelAttr('firestore')
    const path      = this.getModelAttr('path')

    const tombstone = {
      name:      this.data.name,
      isDeleted: true,
      deletedAt: Date.now(),
    }

    await firestore.save(tombstone, path, email)

    const contactsPath = `${path}/${email}/contacts`
    await firestore.deleteCollection(contactsPath)
  }
}

export default User