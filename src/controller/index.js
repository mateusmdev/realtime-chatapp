import IndexView from './../view/index'

class IndexController{
  view = new IndexView()

  constructor(){
    this.initEvents()
  }

  async initEvents(){

  }
}

const indexController = new IndexController()
window.app = indexController