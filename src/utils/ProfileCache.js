class ProfileCache {
  static get() {
    return JSON.parse(localStorage.getItem('contactsProfileCache')) || {}
  }

  static set(cache) {
    const object = {
      isCached: true,
      cache: cache
    }

    localStorage.setItem('contactsProfileCache', JSON.stringify(object))
  }

  static clear() {
    localStorage.removeItem('contactsProfileCache')
  }
}

export default ProfileCache