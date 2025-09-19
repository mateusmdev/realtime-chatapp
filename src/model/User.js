import AbstractModel from "./AbstractModel"

class User extends AbstractModel {
  
  constructor(data = {}){
    super(data, 'user', 'email')
  }

  async findOrCreate(){

      let document = await this.getDocument('user')
      
      if (!document) {
        document = await this._firestore.save(this._data, this._path, this._data[this._primaryKeyProp])
      }

      return document
  }

  async delete(){

  }

}

export default User
