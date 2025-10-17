'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { 
  Upload, 
  Youtube, 
  Mic, 
  Globe, 
  Twitter, 
  FileText,
  FileAudio,
  Podcast,
  Code,
  MessageSquare,
  Mail,
  Plus,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle,
  Trash2
} from 'lucide-react'
import AudioRecorder from './AudioRecorder'
import YouTubeTranscriber from './YouTubeTranscriber'
import AudioFileUploader from './AudioFileUploader'
import WebScraper from './WebScraper'
import FolderSelector from './FolderSelector'

interface AddContentModalProps {
  isOpen: boolean
  onClose: () => void
  onFileUpload: (files: File[], folderId: string) => void
  onTranscriptionComplete: () => void
  selectedFolderId: string
  setSelectedFolderId: (folderId: string) => void
  agentId?: string
}

type Category = 'popular' | 'websites' | 'youtube' | 'socials' | 'files' | 'podcasts' | 'snippets' | 'notes' | 'messaging' | 'speech' | 'audio' | 'webscraping'

interface FileWithValidation extends File {
  isValid: boolean
  errorMessage?: string
}

const AddContentModal: React.FC<AddContentModalProps> = ({
  isOpen,
  onClose,
  onFileUpload,
  onTranscriptionComplete,
  selectedFolderId,
  setSelectedFolderId,
  agentId
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('popular')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [fileValidationErrors, setFileValidationErrors] = useState<{[key: string]: string}>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15MB in bytes

  const categories = [
    { id: 'popular' as Category, label: 'Popular', icon: Upload, active: true },
    { id: 'webscraping' as Category, label: 'Web Scraping', icon: Globe, active: true },
    { id: 'youtube' as Category, label: 'YouTube', icon: Youtube, active: true },
    { id: 'speech' as Category, label: 'Voice Notes', icon: Mic, active: true },
    { id: 'audio' as Category, label: 'Audio Files', icon: FileAudio, active: true },
    // { id: 'socials' as Category, label: 'Socials', icon: Twitter, active: false },
    { id: 'files' as Category, label: 'Files', icon: FileText, active: true },
    // { id: 'podcasts' as Category, label: 'Podcasts', icon: Podcast, active: false },
    // { id: 'snippets' as Category, label: 'Snippets', icon: Code, active: false },
    // { id: 'notes' as Category, label: 'Notes Apps', icon: MessageSquare, active: false },
    // { id: 'messaging' as Category, label: 'Messaging Apps', icon: Mail, active: false },
  ]

  const handleFileSelection = (files: FileList) => {
    if (!files || files.length === 0) return
    const filesArray = Array.from(files)
    
    // Validate each file
    const validationErrors: {[key: string]: string} = {}
    filesArray.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        validationErrors[file.name] = `File size (${formatFileSize(file.size)}) exceeds 15MB limit`
      } else if (file.size === 0) {
        validationErrors[file.name] = 'File is empty'
      }
    })
    
    setFileValidationErrors(validationErrors)
    setSelectedFiles(filesArray)
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName))
    const newErrors = {...fileValidationErrors}
    delete newErrors[fileName]
    setFileValidationErrors(newErrors)
  }
  
  const getValidFiles = () => {
    return selectedFiles.filter(file => !fileValidationErrors[file.name])
  }
  
  const getInvalidFiles = () => {
    return selectedFiles.filter(file => fileValidationErrors[file.name])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files)
    }
  }

  const handleUpload = () => {
    const validFiles = getValidFiles()
    if (validFiles.length > 0) {
      onFileUpload(validFiles, selectedFolderId)
      setSelectedFiles([])
      setFileValidationErrors({})
      onClose()
    }
  }

  const renderContent = () => {
    switch (selectedCategory) {
      case 'popular':
        return (
          <div className="space-y-6">
            {/* File List - Show when files are selected */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Selected Files ({selectedFiles.length})
                  </label>
                  {getValidFiles().length > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {getValidFiles().length} ready to upload
                    </span>
                  )}
                </div>
                
                {/* File List */}
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => {
                    const isValid = !fileValidationErrors[file.name]
                    const error = fileValidationErrors[file.name]
                    
                    return (
                      <div key={index} className={`p-3 flex items-center justify-between ${
                        isValid ? 'bg-white' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {isValid ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p 
                              title={file.name}
                              className={`text-sm font-medium truncate ${
                                isValid ? 'text-gray-900' : 'text-red-900'
                              }`}
                            >
                              {file.name.length > 45 ? `${file.name.substring(0, 42)}...` : file.name}
                            </p>
                            <p className={`text-xs ${
                              isValid ? 'text-gray-500' : 'text-red-600'
                            }`}>
                              {error || formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.name)}
                          className="ml-2 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                
                {/* Upload Button */}
                <div className="flex justify-between items-center">
                  <div>
                    {getInvalidFiles().length > 0 && (
                      <p className="text-xs text-red-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {getInvalidFiles().length} file(s) will be skipped due to validation errors
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleUpload} 
                    disabled={getValidFiles().length === 0}
                  >
                    Upload {getValidFiles().length > 0 && `(${getValidFiles().length})`}
                  </Button>
                </div>
              </div>
            )}

            {/* Drag and Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-700 mb-1">
                  Drag and drop your files here or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    click here to browse
                  </button>
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi"
              />
            </div>

            {/* Quick Action Cards - Only Enabled Options */}
            <div className="grid grid-cols-2 gap-4">
              {/* Upload Files */}
              <Card 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border"
                onClick={() => setSelectedCategory('files')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Upload Files</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Upload PDF, DOCX, TXT and other documents
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>

              {/* YouTube */}
              <Card 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border"
                onClick={() => setSelectedCategory('youtube')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Youtube className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">YouTube</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Transcribe YouTube videos to text
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>

              {/* Voice Notes */}
              <Card 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border"
                onClick={() => setSelectedCategory('speech')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Mic className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Voice Notes</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Record audio and transcribe to text
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>

              {/* Audio Files */}
              <Card 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border"
                onClick={() => setSelectedCategory('audio')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <FileAudio className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Audio Files</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Upload audio files and transcribe to text
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>

              {/* Web Scraping */}
              <Card 
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border"
                onClick={() => setSelectedCategory('webscraping')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Web Scraping</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Extract content from websites and articles
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Card>
            </div>
          </div>
        )

      case 'files':
        return (
          <div className="space-y-4">
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Selected Files ({selectedFiles.length})
                  </label>
                  {getValidFiles().length > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {getValidFiles().length} ready to upload
                    </span>
                  )}
                </div>
                
                {/* File List */}
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {selectedFiles.map((file, index) => {
                    const isValid = !fileValidationErrors[file.name]
                    const error = fileValidationErrors[file.name]
                    
                    return (
                      <div key={index} className={`p-3 flex items-center justify-between ${
                        isValid ? 'bg-white' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {isValid ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isValid ? 'text-gray-900' : 'text-red-900'
                            }`} title={file.name}>
                              {file.name.length > 45 ? `${file.name.substring(0, 42)}...` : file.name}
                            </p>
                            <p className={`text-xs ${
                              isValid ? 'text-gray-500' : 'text-red-600'
                            }`}>
                              {error || formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.name)}
                          className="ml-2 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
                
                {/* Upload Button */}
                <div className="flex justify-between items-center">
                  <div>
                    {getInvalidFiles().length > 0 && (
                      <p className="text-xs text-red-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {getInvalidFiles().length} file(s) will be skipped due to validation errors
                      </p>
                    )}
                  </div>
                  <Button 
                    onClick={handleUpload} 
                    disabled={getValidFiles().length === 0}
                  >
                    Upload {getValidFiles().length > 0 && `(${getValidFiles().length})`}
                  </Button>
                </div>
              </div>
            )}

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">Upload Documents</p>
              <p className="text-gray-600 mb-4">
                Drag and drop files here, or click to select files
              </p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.avi"
              />
            </div>
          </div>
        )

      case 'youtube':
        console.log('AddContentModal - Passing selectedFolderId to YouTubeTranscriber:', selectedFolderId)
        return (
          <div>
            <YouTubeTranscriber 
              defaultFolderId={selectedFolderId}
              hideFolderSelector={true}
              agentId={agentId}
              onTranscriptionComplete={() => {
                onTranscriptionComplete()
                onClose()
              }} 
            />
          </div>
        )

      case 'speech':
        return (
          <div>
            <AudioRecorder 
              defaultFolderId={selectedFolderId}
              hideFolderSelector={true}
              agentId={agentId}
              onTranscriptionComplete={() => {
                onTranscriptionComplete()
                onClose()
              }} 
            />
          </div>
        )

      case 'audio':
        return (
          <div>
            <AudioFileUploader 
              defaultFolderId={selectedFolderId}
              hideFolderSelector={true}
              agentId={agentId}
              onTranscriptionComplete={() => {
                onTranscriptionComplete()
                onClose()
              }} 
            />
          </div>
        )

      case 'webscraping':
        return (
          <div>
            <WebScraper 
              defaultFolderId={selectedFolderId}
              hideFolderSelector={true}
              agentId={agentId}
              onScrapingComplete={() => {
                onTranscriptionComplete()
                onClose()
              }} 
            />
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Coming soon...</p>
          </div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex h-[600px]">
          {/* Left Sidebar */}
          <div className="w-48 bg-gray-50 border-r p-4 overflow-y-auto">
            <div className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => category.active && setSelectedCategory(category.id)}
                    disabled={!category.active}
                    className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-white text-gray-900 font-medium shadow-sm'
                        : category.active
                        ? 'text-gray-700 hover:bg-white hover:text-gray-900'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {categories.find(c => c.id === selectedCategory)?.label}
              </h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AddContentModal
