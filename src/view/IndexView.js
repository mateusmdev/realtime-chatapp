import AbstractView from './AbstractView'
import './../sass/index.scss'

class IndexView extends AbstractView {
  constructor(){
    super()
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
    if (target.id === 'english-term-btn') {
      const { portugueseTermBtn, enTerms, ptTerms } = this.$()
      
      target.classList.remove('disabled')
      enTerms.classList.remove(`disabled`)
      
      portugueseTermBtn.classList.add('disabled')
      ptTerms.classList.add(`disabled`)
    } else {
      const { englishTermBtn, enTerms, ptTerms } = this.$()

      target.classList.remove('disabled')
      ptTerms.classList.remove(`disabled`)
      
      enTerms.classList.add(`disabled`)
      englishTermBtn.classList.add('disabled')
    }
  }
}

export default IndexView
