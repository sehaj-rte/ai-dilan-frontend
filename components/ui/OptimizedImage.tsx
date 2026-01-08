'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { User } from 'lucide-react'

interface OptimizedImageProps {
  src: string | null
  alt: string
  className?: string
  fallbackClassName?: string
  fallbackIcon?: React.ReactNode
  onLoad?: () => void
  onError?: () => void
  priority?: boolean
  sizes?: string
  placeholder?: 'blur' | 'empty'
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  fallbackIcon,
  onLoad,
  onError,
  priority = false,
  sizes,
  placeholder = 'empty'
}) => {
  const [isLoading, setIsLoading] = useState(!!src)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !src) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observerRef.current?.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    )

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [priority, src])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    onLoad?.()
  }, [onLoad])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }, [onError])

  // Don't render anything if no src
  if (!src) {
    return (
      <div className={`${fallbackClassName} flex items-center justify-center`}>
        {fallbackIcon || <User className="h-1/2 w-1/2 text-gray-400" />}
      </div>
    )
  }

  return (
    <div className="relative" ref={imgRef}>
      {/* Loading placeholder */}
      {isLoading && placeholder === 'blur' && (
        <div className={`absolute inset-0 ${className} bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-1/3 w-1/3 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          } ${hasError ? 'hidden' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={sizes}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className={`${fallbackClassName || className} flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200`}>
          {fallbackIcon || <User className="h-1/2 w-1/2 text-gray-400" />}
        </div>
      )}
    </div>
  )
}

export default OptimizedImage