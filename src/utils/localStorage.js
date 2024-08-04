const KEY = import.meta.env.VITE_STORAGE_KEY

class LocalStorage{

  static getAcessToken(){
    return localStorage.getItem(KEY)
  }

  static setAcessToken(data){
    localStorage.setItem(KEY, data)
  }
}

export default LocalStorage