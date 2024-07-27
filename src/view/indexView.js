import AbstractView from './abstractView'
import './../sass/index.scss'


class Index extends AbstractView{
  
  constructor(){
    super()

    console.log(this.el, 'a')
  }

}

export default Index