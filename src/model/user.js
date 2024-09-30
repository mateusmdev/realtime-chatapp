import Firestore from "./../firebase/firestore"

class User{
  _path = 'user'
  _firestore = Firestore.instance

  constructor(data = {}){
    this._data = data
  }

  async getDocuments(path){
    try {
      const docs = this._firestore.findDocs(path, whereParams = [])
      return docs
    } catch (error) {
      throw error
    }
  }

  async findOrCreate(){
      const documentPath = `${this._path}`
      const whereCondition = ['id', '==', this._data.id]
      const query = await this._firestore.findDocs(documentPath, whereCondition)
      const docs = await query.docs
      const isExist = docs && docs.length > 0

      if (isExist){
        const [document] = docs
        return document.data() 
      }

      const result = await this._firestore.save(this._data, this._path)
      return result
  }

  async delete(){

  }

  get data(){
    return this._data
  }

  getAttribute(name){
    return this._data[name]
  }

  setAttribute(name, value){
    if (name === 'id') throw Error('Não é permitido alterar essa valor')

    this._data[name] = value
  }

}

export default User