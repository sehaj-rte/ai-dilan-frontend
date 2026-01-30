/**
 * Image compression utility for mobile optimization
 * Reduces file size while maintaining good quality
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export const compressImage = (
  file: File, 
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    outputFormat = 'image/jpeg'
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      // Maintain aspect ratio while respecting max dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image with high quality
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: outputFormat,
              lastModified: Date.now(),
            });
            
            const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
            const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
            
            console.log(`📷 Compressed ${file.name}: ${originalSizeMB}MB → ${compressedSizeMB}MB`);
            resolve(compressedFile);
          } else {
            console.warn('Image compression failed, using original file');
            resolve(file);
          }
        },
        outputFormat,
        quality
      );
    };
    
    img.onerror = () => {
      console.warn('Failed to load image for compression, using original file');
      resolve(file);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Batch compress multiple images
 */
export const compressImages = async (
  files: File[], 
  options?: CompressionOptions
): Promise<File[]> => {
  return Promise.all(
    files.map(file => {
      if (file.type.startsWith('image/')) {
        return compressImage(file, options);
      }
      return Promise.resolve(file);
    })
  );
};

/**
 * Check if file needs compression based on size and type
 */
export const shouldCompressFile = (file: File, maxSizeMB: number = 2): boolean => {
  const fileSizeMB = file.size / 1024 / 1024;
  return file.type.startsWith('image/') && fileSizeMB > maxSizeMB;
};