import ProfileCache from "../utils/ProfileCache"
import AbstractModel from "./AbstractModel"

class User extends AbstractModel {
  static CURRENT_TERMS_VERSION = 'v1'

  static ALLOWED_FIELDS = [
    'name', 'email', 'picture', 'profilePicture', 'about',
    'isDeleted', 'deletedAt', 'publicKey', 'encryptedPrivateKey',
    'termsAcceptedVersion', 'termsAcceptedAt',
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

  static async saveContact(ownerEmail, contactData) {
    const instance = new User()

    if (contactData.email) {
      contactData.email = contactData.email.toLowerCase()
    }
    const documentPath = `${instance.getModelAttr('path')}/${ownerEmail.toLowerCase()}/contacts`
    const documentRef = await instance.getModelAttr('firestore').save(contactData, documentPath, contactData[instance.getModelAttr('primaryKeyProp')])

    return documentRef
  }

  static async saveContactBilateral(userA, userB, chatId) {
    const instance  = new User()
    const firestore = instance.getModelAttr('firestore')
    const path      = instance.getModelAttr('path')

    const aEmail = userA.email.toLowerCase()
    const bEmail = userB.email.toLowerCase()

    const contactForA = {
      email:          bEmail,
      name:           userB.name,
      picture:        userB.picture ?? '',
      profilePicture: userB.profilePicture ?? userB.picture ?? '',
      chatId:         chatId,
    }

    const contactForB = {
      email:          aEmail,
      name:           userA.name,
      picture:        userA.picture ?? '',
      profilePicture: userA.profilePicture ?? userA.picture ?? '',
      chatId:         chatId,
    }

    await firestore.batchWrite([
      {
        path:       `${path}/${aEmail}/contacts`,
        documentId: bEmail,
        data:       contactForA,
        merge:      true,
      },
      {
        path:       `${path}/${bEmail}/contacts`,
        documentId: aEmail,
        data:       contactForB,
        merge:      true,
      }
    ])
  }

  static async enrichContacts(contacts) {
    if (!contacts || contacts.length === 0) return []

    return Promise.all(
      contacts.map(async contact => {
        const email     = contact.email.toLowerCase()
        const user      = new User({ email })
        const freshData = await user.getDocument()

        return {
          ...contact,
          email,
          about:     freshData?.about     ?? '',
          publicKey: freshData?.publicKey ?? null,
        }
      })
    )
  }

  static listenContacts(ownerEmail, callback, onError = null) {
    const instance  = new User()
    const firestore = instance.getModelAttr('firestore')
    const path      = `${instance.getModelAttr('path')}/${ownerEmail.toLowerCase()}/contacts`
    let latestSequence = 0

    return firestore.onSnapshot(path, null, async (snapshot) => {
      const currentSeq = ++latestSequence
      const docs = snapshot.docs ?? []
      const rawContacts = docs
        .map(doc => {
          const data = doc.data()
          if (data.email) data.email = data.email.toLowerCase()
          return data
        })
        .filter(contact => !contact.isDeleted)

      const enrichedContacts = await User.enrichContacts(rawContacts)

      if (currentSeq !== latestSequence) return

      ProfileCache.set(enrichedContacts)
      callback(enrichedContacts)
    }, [], onError)
  }

  static async getContacts(ownerEmail) {
    const instance = new User()
    const documentPath = `${instance.getModelAttr('path')}/${ownerEmail.toLowerCase()}/contacts`
    const query = await instance.getModelAttr('firestore').findDocs(documentPath)
    const docs = query.docs ?? []

    if (docs.length === 0) return []

    const contacts = docs.map(doc => {
      const data = doc.data()
      if (data.email) data.email = data.email.toLowerCase()
      return data
    }).filter(contact => !contact.isDeleted)

    return contacts
  }

  static async getContactsFromCache(ownerEmail, updateCache = false) {
    const contacts    = await User.getContacts(ownerEmail)
    const cacheObject = ProfileCache.get()
    const cache       = cacheObject?.cache || []

    if (updateCache === false && cache.length === contacts.length) {
      return cache
    }

    const enrichedContacts = await User.enrichContacts(contacts)

    ProfileCache.set(enrichedContacts)
    return enrichedContacts
  }

  static async markContactAsDeleted(ownerEmail, deletedEmail) {
    const email    = deletedEmail.toLowerCase()
    const contacts = await User.getContacts(ownerEmail)

    if (contacts.length === 0) return

    const instance   = new User()
    const firestore  = instance.getModelAttr('firestore')
    const path       = instance.getModelAttr('path')

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

  static async delete(userData) {
    const instance  = new User()
    const email     = userData[instance.getModelAttr('primaryKeyProp')].toLowerCase()
    const firestore = instance.getModelAttr('firestore')
    const path      = instance.getModelAttr('path')

    const tombstone = {
      name:      userData.name,
      isDeleted: true,
      deletedAt: Date.now(),
    }

    await firestore.save(tombstone, path, email)

    const contactsPath = `${path}/${email}/contacts`
    await firestore.deleteCollection(contactsPath)
  }
}

export default User