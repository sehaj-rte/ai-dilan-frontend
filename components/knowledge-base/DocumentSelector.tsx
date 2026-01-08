'use client'
import { API_URL } from '@/lib/config'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  FileText, 
  File,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen
} from 'lucide-react'

interface Document {
  id: string
  name: string
  document_type: string
  size: number
  word_count?: number
  description?: string
  tags: string[]
  processing_status: string
  created_at: string
  preview: string
}

interface DocumentSelectorProps {
  selectedDocuments: string[]
  onSelectionChange: (selectedIds: string[]) => void
  maxSelections?: number
}

const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  selectedDocuments,
  onSelectionChange,
  maxSelections
}) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/knowledge-base/documents/selection`)
      const data = await response.json()
      
      if (data.success) {
        setDocuments(data.documents)
      } else {
        console.error('Failed to fetch documents:', data.error)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentToggle = (documentId: string) => {
    const isSelected = selectedDocuments.includes(documentId)
    
    if (isSelected) {
      // Remove from selection
      onSelectionChange(selectedDocuments.filter(id => id !== documentId))
    } else {
      // Add to selection (check max limit)
      if (!maxSelections || selectedDocuments.length < maxSelections) {
        onSelectionChange([...selectedDocuments, documentId])
      }
    }
  }

  const handleSelectAll = () => {
    const filteredDocs = getFilteredDocuments()
    const allIds = filteredDocs.map(doc => doc.id)
    
    if (maxSelections) {
      onSelectionChange(allIds.slice(0, maxSelections))
    } else {
      onSelectionChange(allIds)
    }
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const getFilteredDocuments = () => {
    return documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesType = filterType === 'all' || doc.document_type === filterType
      
      return matchesSearch && matchesType
    })
  }

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return FileText
      case 'image':
        return ImageIcon
      case 'video':
        return FileVideo
      case 'audio':
        return FileAudio
      default:
        return File
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredDocuments = getFilteredDocuments()
  const documentTypes = Array.from(new Set(documents.map(doc => doc.document_type))).filter(Boolean)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Select Documents
          </CardTitle>
          <CardDescription>
            Choose which documents this expert should have access to
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-blue-500 mr-2" />
            <span>Loading documents...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Select Documents
          </div>
          <div className="text-sm text-gray-500">
            {selectedDocuments.length} selected
            {maxSelections && ` of ${maxSelections} max`}
          </div>
        </CardTitle>
        <CardDescription>
          Choose which documents this expert should have access to. Selected documents will be used to answer questions.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            {documentTypes.map(type => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Selection Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={filteredDocuments.length === 0}
            >
              Select All ({filteredDocuments.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={selectedDocuments.length === 0}
            >
              Clear All
            </Button>
          </div>
          
          {maxSelections && selectedDocuments.length >= maxSelections && (
            <span className="text-sm text-amber-600">
              Maximum selection limit reached
            </span>
          )}
        </div>

        {/* Documents List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No documents found</p>
              <p className="text-sm">Try adjusting your search or filter criteria</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const FileIcon = getFileIcon(doc.document_type)
              const isSelected = selectedDocuments.includes(doc.id)
              const isDisabled = !isSelected && !!maxSelections && selectedDocuments.length >= maxSelections
              
              return (
                <div
                  key={doc.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !isDisabled && handleDocumentToggle(doc.id)}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => handleDocumentToggle(doc.id)}
                    />
                    
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-gray-900 truncate" title={doc.name}>{doc.name}</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {doc.document_type.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{formatFileSize(doc.size)}</span>
                        {doc.word_count && (
                          <>
                            <span>•</span>
                            <span>{doc.word_count.toLocaleString()} words</span>
                          </>
                        )}
                      </div>
                      
                      {doc.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          {doc.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 3 && (
                            <span className="text-xs text-gray-500">+{doc.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      
                      {doc.preview && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {doc.preview}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default DocumentSelector
