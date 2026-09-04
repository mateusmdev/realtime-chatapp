import AbstractView from './AbstractView'
import './../sass/index.scss'
import { marked } from 'marked'

class IndexView extends AbstractView {
  constructor(){
    super()
  }

  _initState() {
    return {
      wasTermAccepted: false,
      canSubmit: false,
    }
  }

  toggleUserTermsModal(open = true) {
    const { termsOfUse } = this.$()

    if (open === true) {
      termsOfUse.classList.remove('disabled')
    } else {
      termsOfUse.classList.add('disabled')
    }
  }

  setTermsModal(target) {
    const { englishTermBtn, portugueseTermBtn, enTerms, ptTerms } = this.$()

    if (target.id === 'english-term-btn') {
      target.classList.remove('disabled')
      enTerms.classList.remove(`disabled`)
      
      portugueseTermBtn.classList.add('disabled')
      ptTerms.classList.add(`disabled`)
    } else {
      target.classList.remove('disabled')
      ptTerms.classList.remove(`disabled`)
      
      enTerms.classList.add(`disabled`)
      englishTermBtn.classList.add('disabled')
    }
  }

  toggleTermBlock() {
    const { termToggle, submitBtn } = this.$()

    if (termToggle.checked) {
      this.setState('wasTermAccepted', true)
      this.setState('canSubmit', true)

      submitBtn.disabled = false
      submitBtn.classList.add(`enabled`)
      return
    }

    this.setState('wasTermAccepted', false)
    this.setState('canSubmit', false)

    submitBtn.disabled = true
    submitBtn.classList.remove('enabled')
  }

  validateUseTerms() {
    const { termToggle } = this.$()
    const wasTermAccepted = this.getState('wasTermAccepted')
    const canSubmit = this.getState('canSubmit')

    const isAccepted = termToggle.checked && wasTermAccepted && canSubmit

    if (isAccepted) {
      return true
    }
    
    this.setDefaultElementsState()
    return false
  }

  setDefaultElementsState() {
    const { termToggle, submitBtn } = this.$()

    termToggle.checked = false
    submitBtn.disabled = true
    submitBtn.classList.remove('enabled')
  }

  setSocialMidiaVisibility(socialMedias) {
    const filteredMidias = Object.entries(socialMedias)
    .filter(currentMedia => {
      const [, value] = currentMedia
      
      return value != null && value.trim() !== ''
    })
    .map(currentMedia => {
      const [name, url] = currentMedia
      return { name, url }
    })

    
    if (filteredMidias.length < 1) return
    
    const dict = {
      1: 'one-item',
      2: 'two-items',
      3: 'three-items',
    }

    const { socialMidiaContainer } = this.$()
    const selectedClass = dict[filteredMidias.length] || 'three-items'

    if (selectedClass) {
      socialMidiaContainer.classList.add(selectedClass);
      
      const midiaBtn = {
        'github': 'githubBtn',
        'linkedin': 'linkedinBtn',
        'portfolio': 'portfolioBtn'
      }
      
      filteredMidias.forEach(currentMidia => {
        if (!midiaBtn[currentMidia.name]) return
        
        const button = this.$(midiaBtn[currentMidia.name])
        button.href = currentMidia.url

        this.addEvent(button, {
          eventName: 'click',
          fn: (event) => window.location.href = currentMidia.url,
          behavior: {
            preventDefault: true
          }
        })
        
        button.classList.add('show')
      })

      return
    }

    socialMidiaContainer.classList.add('three-items')
  }

  async loadMarkdownContent(term, element) {
    const html = await marked.parse(term)
    element.innerHTML = html
  }
}

export default IndexView
