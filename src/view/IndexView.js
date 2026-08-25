import AbstractView from './AbstractView'
import './../sass/index.scss'

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
}

export default IndexView
