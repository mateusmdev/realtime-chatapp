import IMediaStrategy from "../interface/IMediaStrategy";
import 'pdfjs-dist/web/pdf_viewer.css';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

class DocumentHandler extends IMediaStrategy{

  constructor() {
    super()
  }
  
  async execute(data) {
    const { file } = data 
    console.log(data)
    
    if (file.type === 'application/pdf'){
      await this.readPdf(data)
      return
    }
    
    this.previewFile(data)
  }

  previewFile(data){
    
  }
  
  async readPdf(data) {
    const reader = new FileReader()
  
    return new Promise(async (resolve, reject) => {
      
      reader.onload = async event => {
        const pdfData = new Uint8Array(reader.result)
        const workerUrl = './../../pdfjs-dist/build/pdf.worker.min.mjs'
        GlobalWorkerOptions.workerSrc = workerUrl;

        const pdf = await getDocument(pdfData).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 })
        const contextCanvas = data.area.getContext('2d')
        
        data.area.width = viewport.width
        data.area.height = viewport.height
        
        const renderContext = {
          canvasContext: contextCanvas,
          viewport: viewport
        }

        await page.render(renderContext).promise
        resolve()
      }

      reader.onerror = event => {
        reject(event)
      }

      reader.readAsArrayBuffer(data.file)
    })
  }
}

export default DocumentHandler