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
      body: formData,
      // Add timeout for mobile networks
      signal: AbortSignal.timeout(60000) // 60 second timeout
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
 * Upload multiple files to S3 with retry logic for mobile networks
 */
export async function uploadFilesToS3(files: File[]): Promise<S3UploadedFile[]> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  const uploadWithRetry = async (file: File, retryCount = 0): Promise<S3UploadedFile> => {
    try {
      return await uploadFileToS3(file);
    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying upload for ${file.name} (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return uploadWithRetry(file, retryCount + 1);
      }
      throw error;
    }
  };

  // Upload files sequentially on mobile to avoid overwhelming the connection
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile && files.length > 1) {
    console.log('📱 Mobile detected: uploading files sequentially');
    const results: S3UploadedFile[] = [];
    for (const file of files) {
      const result = await uploadWithRetry(file);
      results.push(result);
    }
    return results;
  } else {
    // Upload in parallel for desktop
    const uploadPromises = files.map(file => uploadWithRetry(file));
    return Promise.all(uploadPromises);
  }
}
