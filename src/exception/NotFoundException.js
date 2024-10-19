class NotFoundException extends Error{
  constructor(){
    super('No elements found')
  }
}

export default NotFoundException
