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

  changeSection(button){
    const { messageSection, contactSection, settingSection } = this.el
    const dictionary = {
      'chat-menu-btn': messageSection,
      'contact-menu-btn': contactSection,
      'setting-menu-btn': settingSection,
    }

    const selectedSection = dictionary[button.id] || null
    if (!selectedSection) return

    const activeSection = document.querySelector('.menu section.active')
    const activeMenuBtn = document.querySelector('.navigation-link.active')

    activeSection.classList.remove('active')
    activeMenuBtn.classList.remove('active')

    selectedSection.classList.add('active')
    button.classList.add('active')
  }
}

export default App