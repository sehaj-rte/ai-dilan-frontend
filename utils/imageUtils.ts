/**
 * Convert S3 URL to optimized format
 * Since avatars are now public, we return direct S3 URLs for better performance
 * No need to proxy through the backend anymore
 */
export const convertS3UrlToProxy = (s3Url: string, thumbnail: boolean = false, size: number = 128): string => {
  if (!s3Url) return s3Url;
  
  // Return direct S3 URLs for better performance
  // Avatars are now public with proper CORS headers
  return s3Url;
};

/**
 * Legacy function name for backward compatibility
 */
export const convertS3UrlToOptimized = convertS3UrlToProxy;