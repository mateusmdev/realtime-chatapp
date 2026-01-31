const KEY = import.meta.env.VITE_STORAGE_KEY

class LocalStorage{

  static getAccessToken(){
    return localStorage.getItem(KEY)
  }

  static setAccessToken(data){
    localStorage.setItem(KEY, data)
  }

  static getIconList(){
    return localStorage.getItem('icon-list')
  }

  static setIconList(data){
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

  static clearSession() {
    localStorage.removeItem(KEY)
    localStorage.removeItem('user-data')
  }
}

export default LocalStorage