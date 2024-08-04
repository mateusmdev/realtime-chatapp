import AbstractView from './abstractView'
import './../sass/app.scss'

class App extends AbstractView{
  
  constructor(){
    super()
  }

  setUserContent(data){
    if (!data) return

    const profilePictures = document.querySelectorAll('.profile-picture')

    document.title = data.name;
    [...profilePictures].forEach(picture => {
      picture.src = data.picture
    })

  }
}

export default App