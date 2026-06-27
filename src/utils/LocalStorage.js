
const KEY = import.meta.env.VITE_STORAGE_KEY

class LocalStorage {

  static getAccessToken() {
    return localStorage.getItem(KEY)
  }

  static setAccessToken(data) {
    localStorage.setItem(KEY, data)
  }

  static getIconList() {
    return localStorage.getItem('icon-list')
  }

  static setIconList(data) {
    localStorage.setItem('icon-list', data)
  }

  static getUserData() {
    return localStorage.getItem('user-data')
  }

  static setUserData(data) {
    localStorage.setItem('user-data', data)
  }

  static getUserPreferences() {
    return localStorage.getItem('user-preferences')
  }

  static setUserPreferences(data) {
    localStorage.setItem('user-preferences', data)
  }

  static getFirebaseUid() {
    return localStorage.getItem('firebase-uid')
  }

  static setFirebaseUid(uid) {
    localStorage.setItem('firebase-uid', uid)
  }

  static getResetLockId() {
    return localStorage.getItem('reset-lock-id')
  }

  static setResetLockId(resetLockId) {
    localStorage.setItem('reset-lock-id', resetLockId)
  }


  static clearSession() {
    localStorage.removeItem(KEY)
    localStorage.removeItem('user-data')
    localStorage.removeItem('firebase-uid')   // NOVO: limpar UID na saída
    localStorage.removeItem('reset-lock-id')  // F8: limpar resetLockId na saída
  }
}

export default LocalStorage