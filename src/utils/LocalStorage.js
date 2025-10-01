const KEY = import.meta.env.VITE_STORAGE_KEY

class LocalStorage{

  static getAcessToken(){
    return localStorage.getItem(KEY)
  }

  static setAcessToken(data){
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

}

export default LocalStorage
