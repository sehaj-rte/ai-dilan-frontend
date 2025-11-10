import { API_URL } from './config'

export interface S3UploadedFile {
  url: string
  s3_key: string
  name: string
  type: string
  size: number
}

/**
 * Upload file to S3 via backend endpoint
 * Backend uses the same AWS S3 service as expert avatars
 * Files are stored in the 'chat-files' folder
 */
export async function uploadFileToS3(file: File): Promise<S3UploadedFile> {
  try {
    console.log(`📤 Uploading ${file.name} to S3...`)
    
    // Upload file via backend (backend handles S3 upload)
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/openai-chat/upload/chat-file`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${errorText}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed')
    }

    console.log(`✅ Uploaded ${file.name} to S3: ${result.url}`)

    return {
      url: result.url,
      s3_key: result.s3_key,
      name: result.name,
      type: result.type,
      size: result.size
    }
  } catch (error) {
    console.error('S3 upload error:', error)
    throw error
  }
}

/**
 * Upload multiple files to S3
 */
export async function uploadFilesToS3(files: File[]): Promise<S3UploadedFile[]> {
  const uploadPromises = files.map(file => uploadFileToS3(file))
  return Promise.all(uploadPromises)
}
