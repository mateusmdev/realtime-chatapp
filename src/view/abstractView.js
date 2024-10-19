import NotFoundException from "./../exception/NotFoundException"

class AbstractView{
  el = {}

  constructor(){
    this._loadElements()
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

  async addEvent(selectedItem, eventParams){
    const { eventName, fn } = eventParams

    const element = this._defineEventItems(selectedItem)
    const splitedNames = eventName.split(' ')

    if (!element) throw new NotFoundException()

    const eventList = splitedNames.map(name => {
      return new Promise(function(resolve, reject){
        element.addEventListener(name, e => {
          eventParams.preventDefault ? e.preventDefault() : null
          fn(e)
        }, false)

        resolve()
      })
    })

    await Promise.all(eventList)
  }
  
  async addEventAll(selectedItems, eventParams){
    const { eventName, fn } = eventParams
    const elements = this._defineEventItems(selectedItems, true)
    const splitedNames = eventName.split(' ')

    const isEmptyArray = Array.isArray(elements) && elements.length === 0
    if (!elements || isEmptyArray) throw new NotFoundException()

    const callback = (element) => {
      splitedNames.forEach(name => {
        element.addEventListener(name, e => {
          eventParams.preventDefault ? e.preventDefault() : null
          fn(e)
        })
      })
    }

    const eventsList = [...elements].map(item => {

      return new Promise(function(resolve, reject){
        callback(item)
        resolve()
      })
    })

    await Promise.all(eventsList)
  }

  createElement(name, parent, attributes = {}){
    const element = document.createElement(name)
    Object.keys(attributes).forEach(attr => element[attr] = attributes[attr])
    parent.appendChild(element)

    return element
  }
}

export default AbstractView