import AbstractView from './abstractView'
import './../sass/app.scss'


class Index extends AbstractView{
  
  constructor(){
    super()

    console.log(this.el, 'a')
  }

}

export default Index