'use client'

import React, { useState, useEffect } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, FileText, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/lib/config'

interface FileAttachment {
  name: string
  type: string
  url: string
  size: number
}

interface FilePreviewModalProps {
  file: FileAttachment | null
  files?: FileAttachment[]
  isOpen: boolean
  onClose: () => void
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, files = [], isOpen, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pdfPage, setPdfPage] = useState(1)
  const [totalPdfPages, setTotalPdfPages] = useState(1)

  // Convert S3 URLs to proxy URLs for private bucket access
  const convertS3UrlToProxy = (s3Url: string): string => {
    if (!s3Url) return s3Url
    const match = s3Url.match(/https:\/\/ai-dilan\.s3\.[^/]+\.amazonaws\.com\/(.+)/)
    if (match) {
      return `${API_URL}/images/avatar/full/${match[1]}`
    }
    return s3Url
  }

  // Find current file index when file prop changes
  useEffect(() => {
    if (file && files.length > 0) {
      const index = files.findIndex(f => f.url === file.url)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [file, files])

  // Reset zoom and rotation when file changes
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setPdfPage(1)
  }, [currentIndex, file])

  if (!isOpen || !file) return null

  const currentFile = files.length > 0 ? files[currentIndex] : file
  const isImage = currentFile.type.startsWith('image/')
  const isPDF = currentFile.type === 'application/pdf'
  const canNavigate = files.length > 1

  const handlePrevious = () => {
    if (canNavigate && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (canNavigate && currentIndex < files.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = convertS3UrlToProxy(currentFile.url)
    link.download = currentFile.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 text-white min-w-0">
            {isImage ? (
              <ImageIcon className="h-5 w-5 flex-shrink-0" />
            ) : isPDF ? (
              <FileText className="h-5 w-5 flex-shrink-0" />
            ) : (
              <FileText className="h-5 w-5 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h3 className="font-medium truncate">{currentFile.name}</h3>
              <p className="text-sm text-gray-300">
                {formatFileSize(currentFile.size)}
                {canNavigate && ` • ${currentIndex + 1} of ${files.length}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Navigation buttons */}
            {canNavigate && (
              <>
                <Button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentIndex === files.length - 1}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            
            {/* Image controls */}
            {isImage && (
              <>
                <Button
                  onClick={handleZoomOut}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleZoomIn}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleRotate}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white hover:bg-opacity-20"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
              </>
            )}
            
            {/* Download button */}
            <Button
              onClick={handleDownload}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <Download className="h-5 w-5" />
            </Button>
            
            {/* Close button */}
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-2 pt-16 pb-20">
        {isImage ? (
          <div className="max-w-full max-h-full overflow-auto">
            <img
              src={convertS3UrlToProxy(currentFile.url)}
              alt={currentFile.name}
              className="max-w-none transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                maxWidth: zoom === 1 ? '100%' : 'none',
                maxHeight: zoom === 1 ? '100%' : 'none',
              }}
              onClick={(e) => {
                // Zoom in on click if not already zoomed
                if (zoom === 1) {
                  handleZoomIn()
                }
              }}
            />
          </div>
        ) : isPDF ? (
          <div className="w-full h-full">
            <iframe
              src={`${convertS3UrlToProxy(currentFile.url)}#page=${pdfPage}&view=Fit&toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full bg-white rounded-lg border-0"
              title={currentFile.name}
              style={{ 
                minHeight: '85vh',
                width: '100%',
                height: '100%'
              }}
              allow="fullscreen"
            />
          </div>
        ) : (
          <div className="text-center text-white">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Preview not available</p>
            <p className="text-sm text-gray-300 mb-4">
              This file type cannot be previewed in the browser
            </p>
            <Button
              onClick={handleDownload}
              className="bg-white text-black hover:bg-gray-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        )}
      </div>

      {/* Bottom controls for PDF */}
      {isPDF && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-4 p-4 text-white">
            <Button
              onClick={() => setPdfPage(prev => Math.max(1, prev - 1))}
              disabled={pdfPage === 1}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm">
              Page {pdfPage} of {totalPdfPages}
            </span>
            
            <Button
              onClick={() => setPdfPage(prev => prev + 1)}
              disabled={pdfPage === totalPdfPages}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts info */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-400">
        <div>ESC to close</div>
        {canNavigate && <div>← → to navigate</div>}
        {isImage && <div>Click to zoom</div>}
      </div>

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}

// Keyboard shortcuts
const useKeyboardShortcuts = (
  isOpen: boolean,
  onClose: () => void,
  onPrevious: () => void,
  onNext: () => void,
  canNavigate: boolean
) => {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (canNavigate) onPrevious()
          break
        case 'ArrowRight':
          if (canNavigate) onNext()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onPrevious, onNext, canNavigate])
}

export default FilePreviewModal
