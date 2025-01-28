import IMediaStrategy from "../interface/IMediaStrategy";
import 'pdfjs-dist/web/pdf_viewer.css';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';

class DocumentHandler extends IMediaStrategy{

  constructor() {
    super()
  }
  
  async execute(data) {
    const reader = new FileReader()
    
    const readPdf = function() {
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
          console.log('here')
          reject({event, a:'aaa'})
        }
  
        reader.readAsArrayBuffer(data.file)
      })
    }

    await readPdf()
  }
}

export default DocumentHandler