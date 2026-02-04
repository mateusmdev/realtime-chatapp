import IMediaStrategy from "../interface/IMediaStrategy";

class RenderImage extends IMediaStrategy{

  constructor() {
    super()
  }
  
  async execute(data) {
    const { file } = data 
    
    if (file.type.startsWith('image/')) {
      await this.previewImage(data)
    }
  }

  async previewImage(data){
    const reader = new FileReader()

    return new Promise(async (resolve, reject) => {
      reader.onload = async event => {

        const { file, area } = data

        area.image.src = reader.result
        area.name.innerText = file.name

        resolve()
      }

      reader.onerror = event => {
        reject(event)
      }

      reader.readAsDataURL(data.file)
    })
  }
    
}

export default RenderImage