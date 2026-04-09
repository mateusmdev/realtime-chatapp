import AbstractView from './AbstractView'
import './../sass/index.scss'

class IndexView extends AbstractView{
  constructor(){
    super()
  }

  initLayout(preferences = {}) {
    const { wallpaper, overlay } = this.$()
    wallpaper.style.backgroundImage = `url(${preferences.backgroundImage})`
    overlay.style.opacity = '1'
  }
}

export default IndexView
