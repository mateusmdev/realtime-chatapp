import NotFoundException from "./../exception/NotFoundException"

class AbstractView{
  el = {}
  state = {}

  constructor(){
    this._loadElements()
    this.state = this._initState()
  }

  _initState() {
    return {}
  }

  _loadElements(){
    const ids = document.querySelectorAll('[id]')
    ids.forEach(element => {
      const div = document.createElement('div')
      div.innerHTML = `<div data-${element.id}="id"></div>`
      const idCamelCase = Object.keys(div.firstChild.dataset)[0]
      this.el[idCamelCase] = element
    })
  }

  _defineEventItems(items, selectorAll = false){
    const isString = typeof items === 'string' || items instanceof String

    if (!isString) return items

    const queryFn = selectorAll ? document.querySelectorAll : document.querySelector
    return queryFn.call(document, items)
  }

  addEvent(selectedItem, eventParams){
    const { eventName, fn } = eventParams

    const element = this._defineEventItems(selectedItem)
    const splitedNames = eventName.split(' ')

    if (!element) throw new NotFoundException()

    splitedNames.forEach(name => {
      element.addEventListener(name, e => {
        const { behavior = {} } = eventParams

        behavior.preventDefault ? e.preventDefault() : null
        behavior.stopPropagation ? e.stopPropagation() : null
        fn(e)
      }, false)
    })
  }
  
  addEventAll(selectedItems, eventParams){
    const { eventName, fn } = eventParams
    const elements = this._defineEventItems(selectedItems, true)
    const splitedNames = eventName.split(' ')

    if (!elements || elements.length === 0) throw new NotFoundException()
    
    elements.forEach(element => {
      splitedNames.forEach(name => {
        element.addEventListener(name, e => {
          const { behavior = {}} = eventParams

          behavior.preventDefault ? e.preventDefault() : null
          behavior.stopPropagation ? e.stopPropagation() : null
          fn(e)
        })
      })
    })
  }

  createElement(name, parent, attributes = {}){
    const element = document.createElement(name)

    Object.keys(attributes).forEach(attr => { 
      if (attr in element) {
        element[attr] = attributes[attr]
      } else {
        element.setAttribute(attr, attributes[attr])
      }
    })

    if (parent != null) {
      parent.appendChild(element) 
    }
    
    return element
  }
}

export default AbstractView
