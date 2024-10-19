import AbstractView from './AbstractView'
import './../sass/app.scss'

class AppView extends AbstractView{
  
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

  toggleContentScreen(screenName, value){
    const messageScreen = document.querySelector('.message-screen')
    messageScreen.classList.toggle
  }
  
  messageScreenToggle(){
    const contentScreen = document.querySelector('main')
    contentScreen.classList.toggle('messages')
  }

  setAddContactModal(element){
    const { addContactBtn } = this.el
    const overley = document.querySelector('.overlay-layer .add-contact')

    if (element === addContactBtn){
      overley.classList.add('overlay-active')
      return
    }
    
    overley.classList.remove('overlay-active')
  }
}

export default AppView