import NotFoundException from "./../exception/NotFoundException"

class AbstractView {
  #el = new Map()
  #state = {}
  #root = null

  constructor(root = document) {
    this.#root = root
    this.#state = this._initState()
    this.#loadElements()
  }

  _initState() {
    return {}
  }

  #loadElements() {
    const ids = this.#root.querySelectorAll('[id]')
    ids.forEach(element => {
      const div = document.createElement('div')
      div.innerHTML = `<div data-${element.id}="id"></div>`
      const idCamelCase = Object.keys(div.firstChild.dataset)[0]
      this.#el.set(idCamelCase, element)
    })
  }

  #defineEventItems(items, selectorAll = false) {
    const isString = typeof items === 'string' || items instanceof String

    if (!isString) return items

    if (items.startsWith('#')) {
      const elementName = items.substring(1)
      return this.$(elementName)
    }

    const queryFn = selectorAll ? this.#root.querySelectorAll : this.#root.querySelector
    const result = queryFn.call(this.#root, items)

    if (!result || (selectorAll && result.length === 0)) {
      return undefined
    }

    return result
  }

  getState(...names) {
    if (names.length === 0) {
      return { ...this.#state }
    }

    const selected = names.map(name => {
      if (!(name in this.#state)) {
        throw new Error(`The state "${name}" does not exist.`)
      }
      return this.#state[name]
    })

    return selected.length === 1 ? selected[0] : selected
  }

  setState(name, value) {
    if (!name) throw new Error(`Invalid state name: "${name}"`)
    if (!(name in this.#state)) {
      throw new Error(`State "${name}" does not exist.`)
    }

    this.#state[name] = value
  }

  $(...names) {
    if (names.length === 0) {
      return Object.fromEntries(this.#el.entries())
    }
  
    if (names.length === 1) {
      const [currentName] = names
      const element = this.#el.get(currentName) 
  
      if (!element) throw new Error(`Element "${currentName}" does not exist.`)
  
      return element
    }
  
    const selected = names.map(name => {
      if (!this.#el.has(name)) throw new Error(`Element "${name}" does not exist.`)
      return this.#el.get(name)
    })
  
    return selected
  }

  addEvent(selectedItem, eventParams) {
    const { eventName, fn } = eventParams

    const element = this.#defineEventItems(selectedItem)
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
  
  addEventAll(selectedItems, eventParams) {
    const elements = this.#defineEventItems(selectedItems, true)

    if (!elements || elements.length === 0) throw new NotFoundException()
    
    elements.forEach(element => {
      this.addEvent(element, eventParams)

    })
  }

  createElement(name, parent, attributes = {}) {
    const element = document.createElement(name)

    Object.keys(attributes).forEach(attr => { 
      if (attr in element) {
        element[attr] = attributes[attr]
      } else {
        element.setAttribute(attr, attributes[attr])
      }
    })

    if (parent) {
      parent.appendChild(element) 
    }
    
    return element
  }

  setStyle(element, styles = {}) {
    Object.assign(element.style, styleAttr)
  }
}

export default AbstractView