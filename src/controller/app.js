import AppView from './../view/appView'

class AppController{
  view = new AppView()

  constructor(){
    this.initEvents()
  }

  async initEvents(){

  }
}

const appController = new AppController()
window.app = appController