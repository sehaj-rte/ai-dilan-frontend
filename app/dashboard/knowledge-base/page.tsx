'use client'
import { API_URL } from '@/lib/config'

import React from 'react'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import EnhancedKnowledgeBase from '@/components/knowledge-base/EnhancedKnowledgeBase'

const KnowledgeBasePage = () => {

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_URL}/knowledge-base/files`)
      const data = await response.json()
      
      if (data.success) {
        setFiles(data.files)
      } else {
        console.error('Failed to fetch files:', data.error)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      // Set demo files for now
      setFiles([
        {
          id: '1',
          name: 'AI_Research_Paper.pdf',
          original_name: 'AI_Research_Paper.pdf',
          size: 2457600,
          type: 'application/pdf',
          url: 'https://ai-dilan.s3.amazonaws.com/files/AI_Research_Paper.pdf',
          created_at: '2024-01-15T10:30:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          tags: ['AI', 'Research', 'Machine Learning'],
          document_type: 'pdf',
          language: 'en',
          word_count: 5420,
          page_count: 12,
          processing_status: 'completed',
          extracted_text_preview: 'This research paper explores the latest developments in artificial intelligence...',
          has_images: true,
          has_tables: false,
          uploadDate: '2024-01-15T10:30:00Z',
          status: 'completed'
        },
        {
          id: '2',
          name: 'Training_Dataset.csv',
          original_name: 'Training_Dataset.csv',
          size: 1048576,
          type: 'text/csv',
          url: 'https://ai-dilan.s3.amazonaws.com/files/Training_Dataset.csv',
          created_at: '2024-01-14T14:20:00Z',
          updated_at: '2024-01-14T14:20:00Z',
          tags: ['Dataset', 'Training', 'CSV'],
          document_type: 'csv',
          language: 'en',
          word_count: 2150,
          page_count: 1,
          processing_status: 'completed',
          extracted_text_preview: 'Name, Age, Category, Score\nJohn Doe, 25, A, 95\nJane Smith, 30, B, 87...',
          has_images: false,
          has_tables: true,
          uploadDate: '2024-01-14T14:20:00Z',
          status: 'completed'
        }
      ])
    }
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
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (fileList: FileList) => {
    const filesArray = Array.from(fileList)
    setUploading(true)

    for (const file of filesArray) {
      const tempId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
      
      // Add file to state with uploading status
      const newFile: UploadedFile = {
        id: tempId,
        name: file.name,
        original_name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        processing_status: 'processing',
        has_images: false,
        has_tables: false,
        uploadDate: new Date().toISOString(),
        status: 'uploading'
      }
      
      setFiles(prev => [...prev, newFile])

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_URL}/knowledge-base/upload`, {
          method: 'POST',
          body: formData
        })

        const result = await response.json()

        if (result.success) {
          // Update file with completed status and S3 URL
          setFiles(prev => prev.map(f => 
            f.id === tempId 
              ? { ...f, status: 'completed', url: result.url, id: result.id }
              : f
          ))
        } else {
          // Update file with error status
          setFiles(prev => prev.map(f => 
            f.id === tempId 
              ? { ...f, status: 'error' }
              : f
          ))
        }
      } catch (error) {
        console.error('Upload error:', error)
        // Update file with error status
        setFiles(prev => prev.map(f => 
          f.id === tempId 
            ? { ...f, status: 'error' }
            : f
        ))
      }
    }

    setUploading(false)
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const response = await fetch(`${API_URL}/knowledge-base/files/${fileId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
      } else {
        alert('Failed to delete file')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Error deleting file')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon
    if (type.startsWith('video/')) return FileVideo
    if (type.startsWith('audio/')) return FileAudio
    if (type.includes('pdf')) return FileText
    return File
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <DashboardLayout>
      <EnhancedKnowledgeBase />
    </DashboardLayout>
  )
}

export default KnowledgeBasePage
