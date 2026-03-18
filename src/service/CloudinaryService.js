const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

class CloudinaryService {
  static #MAX_SIZE_BYTES = 5 * 1024 * 1024

  static async upload(file) {
    if (file.size > CloudinaryService.#MAX_SIZE_BYTES) {
      throw new Error('O arquivo excede o tamanho máximo permitido de 5MB.')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.secure_url
  }

  static async uploadBase64(base64DataUrl) {
    const base64Regex = /^data:(.+);base64,(.*)$/

    if (!base64DataUrl.match(base64Regex)) {
      throw new Error('Formato de imagem inválido.')
    }

    const formData = new FormData()
    formData.append('file', base64DataUrl)
    formData.append('upload_preset', UPLOAD_PRESET)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.secure_url
  }

  static async uploadRaw(file) {
    if (file.size > CloudinaryService.#MAX_SIZE_BYTES) {
      throw new Error('O arquivo excede o tamanho máximo permitido de 5MB.')
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', UPLOAD_PRESET)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.secure_url
  }
}

export default CloudinaryService