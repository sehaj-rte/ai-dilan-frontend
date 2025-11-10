'use client'

import React, { useState, useCallback } from 'react'
import { API_URL } from '@/lib/config'
import { fetchWithAuth, getAuthHeaders, getAuthHeadersForFormData } from '@/lib/api-client'
import { X, Upload, FileAudio, Loader2, CheckCircle, AlertCircle, Play, Pause, Trash2, ArrowRight, ArrowLeft, Shield, Zap, Mic } from 'lucide-react'

interface PVCCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess: () => void
}

interface UploadedFile {
  id: string
  file: File | Blob
  name: string
  size: number
  type: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  isRecorded?: boolean // Mark files that were recorded vs uploaded
}

const SUPPORTED_FORMATS = ['.mp3', '.wav', '.m4a', '.flac', '.webm', '.ogg']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MIN_FILES = 3
const MAX_FILES = 25

export default function PVCCreationWizard({ isOpen, onClose, projectId, onSuccess }: PVCCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [voiceName, setVoiceName] = useState('')
  const [language, setLanguage] = useState('en')
  const [accent, setAccent] = useState('american')
  const [gender, setGender] = useState('male')
  const [age, setAge] = useState('middle_aged')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  
  // PVC Workflow states
  const [createdVoiceId, setCreatedVoiceId] = useState<string | null>(null)
  const [voiceStatus, setVoiceStatus] = useState<'created' | 'samples_uploaded' | 'captcha_ready' | 'verified' | 'training' | 'completed' | 'failed'>('created')
  const [captchaData, setCaptchaData] = useState<any>(null)
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  
  // Sample recording states (for step 1)
  const [isSampleRecording, setIsSampleRecording] = useState(false)
  const [sampleMediaRecorder, setSampleMediaRecorder] = useState<MediaRecorder | null>(null)
  const [sampleRecordingTime, setSampleRecordingTime] = useState(0)
  const [verificationCode, setVerificationCode] = useState('')
  const [isProcessingWorkflow, setIsProcessingWorkflow] = useState(false)
  const [workflowSuccess, setWorkflowSuccess] = useState<string | null>(null)

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' }
  ]

  const accents = [
    { code: 'american', name: 'American' },
    { code: 'australian', name: 'Australian' },
    { code: 'british', name: 'British' },
    { code: 'canadian', name: 'Canadian' },
    { code: 'indian', name: 'Indian' },
    { code: 'irish', name: 'Irish' },
    { code: 'jamaican', name: 'Jamaican' },
    { code: 'new_zealand', name: 'New Zealand' },
    { code: 'nigerian', name: 'Nigerian' },
    { code: 'scottish', name: 'Scottish' },
    { code: 'south_african', name: 'South African' },
    { code: 'african_american', name: 'African American' },
    { code: 'singaporean', name: 'Singaporean' },
    { code: 'us_boston', name: 'US - Boston' },
    { code: 'us_chicago', name: 'US - Chicago' },
    { code: 'us_new_york', name: 'US - New York' },
    { code: 'us_southern', name: 'US - Southern' },
    { code: 'us_midwest', name: 'US - Midwest' },
    { code: 'us_northeast', name: 'US - Northeast' },
    { code: 'cockney', name: 'Cockney' }
  ]

  const genders = [
    { code: 'male', name: 'Male' },
    { code: 'female', name: 'Female' },
    { code: 'neutral', name: 'Neutral' }
  ]

  const ages = [
    { code: 'young', name: 'Young' },
    { code: 'middle_aged', name: 'Middle Aged' },
    { code: 'old', name: 'Old' }
  ]

  const resetForm = () => {
    setCurrentStep(1)
    setVoiceName('')
    setLanguage('en')
    setAccent('american')
    setGender('male')
    setAge('middle_aged')
    setDescription('')
    setFiles([])
    setError(null)
    setIsUploading(false)
    setIsCreating(false)
    
    // Reset workflow states
    setCreatedVoiceId(null)
    setVoiceStatus('created')
    setCaptchaData(null)
    setVerificationCode('')
    setIsProcessingWorkflow(false)
    setWorkflowSuccess(null)
    
    // Reset recording states
    setIsRecording(false)
    setRecordedAudio(null)
    setMediaRecorder(null)
    setRecordingTime(0)
    
    // Reset sample recording states
    setIsSampleRecording(false)
    setSampleMediaRecorder(null)
    setSampleRecordingTime(0)
  }

  const cleanupOnClose = () => {
    // Stop any ongoing CAPTCHA recording
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      // @ts-ignore
      if (mediaRecorder.timerId) {
        // @ts-ignore
        clearInterval(mediaRecorder.timerId)
      }
    }

    // Stop any ongoing sample recording
    if (sampleMediaRecorder && sampleMediaRecorder.state === 'recording') {
      sampleMediaRecorder.stop()
      // @ts-ignore
      if (sampleMediaRecorder.timerId) {
        // @ts-ignore
        clearInterval(sampleMediaRecorder.timerId)
      }
    }


    // Clean up any media streams
    if (mediaRecorder && mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
    }
  }

  const handleClose = () => {
    cleanupOnClose()
    resetForm()
    onClose()
  }

  const validateFiles = (fileList: FileList): string | null => {
    if (fileList.length === 0) return 'Please select at least one file'
    if (files.length + fileList.length > MAX_FILES) {
      return `Maximum ${MAX_FILES} files allowed`
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        return `File "${file.name}" is too large. Maximum size is 50MB.`
      }

      // Check file format
      const extension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!SUPPORTED_FORMATS.includes(extension)) {
        return `File "${file.name}" has unsupported format. Supported: ${SUPPORTED_FORMATS.join(', ')}`
      }
    }

    return null
  }

  const handleFileSelect = (fileList: FileList) => {
    const validationError = validateFiles(fileList)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const newFiles: UploadedFile[] = Array.from(fileList).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending',
      progress: 0,
      isRecorded: false
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [])

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const canProceedToStep2 = () => {
    return voiceName.trim().length >= 3 && language && files.length >= MIN_FILES
  }

  const canCreateVoice = () => {
    return files.length >= MIN_FILES && files.every(f => f.status === 'completed' || f.status === 'pending')
  }

  const handleGetCaptcha = async () => {
    if (!createdVoiceId) return

    setIsProcessingWorkflow(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/pvc/${createdVoiceId}/captcha`, {
        method: 'GET',
        headers: getAuthHeaders()
      })

      const data = await response.json()

      if (response.ok) {
        // Store the CAPTCHA data for display
        setCaptchaData(data)
        setVoiceStatus('captcha_ready')
        setCurrentStep(4)
        
        // Log the response structure for debugging
        console.log('CAPTCHA Response:', data)
        
        if (data.captcha_data?.text) {
          setWorkflowSuccess('CAPTCHA text ready! Please read the text aloud.')
        } else if (data.captcha_image) {
          setWorkflowSuccess('CAPTCHA image ready! Please follow the instructions.')
        } else if (data.captcha_text) {
          setWorkflowSuccess('CAPTCHA ready! Please complete the verification.')
        } else {
          setWorkflowSuccess('CAPTCHA ready! Please complete the verification.')
        }
      } else {
        setError(data.detail || 'Failed to get CAPTCHA')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setIsProcessingWorkflow(false)
    }
  }

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const audioChunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        setRecordedAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop()) // Clean up
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Store timer ID for cleanup
      // @ts-ignore
      recorder.timerId = timer

    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      setIsRecording(false)
      
      // Clear timer
      // @ts-ignore
      if (mediaRecorder.timerId) {
        // @ts-ignore
        clearInterval(mediaRecorder.timerId)
      }
    }
  }

  const clearRecording = () => {
    setRecordedAudio(null)
    setRecordingTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Sample recording functions (for step 1 - upload samples)
  const startSampleRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const audioChunks: BlobPart[] = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
        
        // Convert recorded blob to UploadedFile format
        const recordedFile: UploadedFile = {
          id: `recorded-${Date.now()}`,
          name: `Voice Sample ${files.length + 1}.wav`,
          size: audioBlob.size,
          type: 'audio/wav',
          file: audioBlob,
          status: 'completed',
          progress: 100,
          isRecorded: true // Mark as recorded
        }

        setFiles(prev => [...prev, recordedFile])
        stream.getTracks().forEach(track => track.stop()) // Clean up
        setSampleRecordingTime(0)
      }

      recorder.start()
      setSampleMediaRecorder(recorder)
      setIsSampleRecording(true)
      setSampleRecordingTime(0)

      // Start timer
      const timer = setInterval(() => {
        setSampleRecordingTime(prev => prev + 1)
      }, 1000)

      // Store timer ID for cleanup
      // @ts-ignore
      recorder.timerId = timer

    } catch (error) {
      console.error('Error starting sample recording:', error)
      setError('Could not access microphone. Please check permissions.')
    }
  }

  const stopSampleRecording = () => {
    if (sampleMediaRecorder && sampleMediaRecorder.state === 'recording') {
      sampleMediaRecorder.stop()
      setIsSampleRecording(false)
      
      // Clear timer
      // @ts-ignore
      if (sampleMediaRecorder.timerId) {
        // @ts-ignore
        clearInterval(sampleMediaRecorder.timerId)
      }
    }
  }


  const handleSubmitCaptchaRecording = async () => {
    if (!createdVoiceId || !recordedAudio) {
      setError('Please record your voice reading the CAPTCHA text first.')
      return
    }

    setIsProcessingWorkflow(true)
    setError(null)

    try {
      const formData = new FormData()
      // Backend expects 'captcha_files' field name (it converts to 'recording' for ElevenLabs)
      formData.append('captcha_files', recordedAudio, 'captcha_recording.wav')

      // Use FormData headers (no Content-Type header for multipart)
      const headers = getAuthHeadersForFormData()

      // Debug: Log what we're sending
      console.log('Sending CAPTCHA recording:', {
        voiceId: createdVoiceId,
        audioSize: recordedAudio.size,
        audioType: recordedAudio.type
      })

      console.log('Request URL:', `${API_URL}/pvc/${createdVoiceId}/captcha`)
      console.log('FormData entries:')
      console.log('- captcha_files field exists:', formData.has('captcha_files'))
      console.log('- captcha_files value:', formData.get('captcha_files'))

      const response = await fetch(`${API_URL}/pvc/${createdVoiceId}/captcha`, {
        method: 'POST',
        headers: headers,
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setVoiceStatus('training')
        setCurrentStep(5)
        setWorkflowSuccess('🎉 CAPTCHA verified! Voice training has started in the background and will continue automatically.')
        // Clear the recording
        clearRecording()
      } else {
        // Provide more helpful error messages
        let errorMessage = data.detail || data.error || 'Failed to verify CAPTCHA recording'
        
        // Add helpful tips based on common errors
        if (errorMessage.toLowerCase().includes('match') || errorMessage.toLowerCase().includes('verify')) {
          errorMessage += '\n\n💡 Tips: Make sure you read the text exactly as shown, speak clearly in the same voice as your training samples, and record in a quiet environment.'
        }
        
        setError(errorMessage)
      }
    } catch (error) {
      console.error('CAPTCHA submission error:', error)
      setError('Network error occurred while submitting recording')
    } finally {
      setIsProcessingWorkflow(false)
    }
  }

  // Training is now automatic after CAPTCHA - no manual trigger needed

  const handleFinishWorkflow = () => {
    onSuccess()
    handleClose()
  }

  const handleCreateVoice = async () => {
    if (!canCreateVoice()) return

    try {
      setIsCreating(true)
      setError(null)

      // Check if user already has PVC voices (limit: 1 professional voice clone)
      const existingVoicesResponse = await fetch(`${API_URL}/voices/user`, {
        headers: getAuthHeaders()
      })

      if (existingVoicesResponse.ok) {
        const existingVoices = await existingVoicesResponse.json()
        const pvcVoices = existingVoices.filter((voice: any) => 
          voice.category === 'professional' || 
          voice.labels?.category === 'professional' ||
          voice.fine_tuning // Has fine_tuning means it's a PVC
        )

        if (pvcVoices.length > 0) {
          setError('You can only have one Professional Voice Clone. Please delete your existing PVC voice to create a new one.')
          setIsCreating(false)
          return
        }
      }

      // Step 1: Create PVC voice with metadata (JSON)
      const createVoiceResponse = await fetch(`${API_URL}/pvc/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name: voiceName,
          language: language,
          description: description || undefined,
          expert_id: projectId,
          labels: {
            "Accent": accents.find(a => a.code === accent)?.name || "American",
            "Gender": genders.find(g => g.code === gender)?.name || "Male", 
            "Age": ages.find(a => a.code === age)?.name || "Middle Aged"
          }
        })
      })

      if (!createVoiceResponse.ok) {
        const errorData = await createVoiceResponse.json()
        throw new Error(errorData.detail || 'Failed to create professional voice')
      }

      const createData = await createVoiceResponse.json()
      
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create professional voice')
      }

      const voiceId = createData.voice_id

      // Step 2: Add samples to the PVC voice (FormData)
      const formData = new FormData()
      files.forEach(fileItem => {
        formData.append('files', fileItem.file)
      })

      const addSamplesResponse = await fetch(`${API_URL}/pvc/${voiceId}/samples`, {
        method: 'POST',
        headers: getAuthHeadersForFormData(),
        body: formData
      })

      if (!addSamplesResponse.ok) {
        const errorData = await addSamplesResponse.json()
        throw new Error(errorData.detail || 'Failed to add samples to professional voice')
      }

      const samplesData = await addSamplesResponse.json()
      
      if (samplesData.success) {
        // Instead of closing, advance to verification step
        setCreatedVoiceId(voiceId)
        setVoiceStatus('samples_uploaded')
        setCurrentStep(3)
        setError(null)
      } else {
        throw new Error(samplesData.error || 'Failed to add samples to professional voice')
      }
    } catch (err) {
      console.error('Error creating PVC voice:', err)
      setError(err instanceof Error ? err.message : 'Failed to create professional voice')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create Professional Voice</h2>
            <p className="text-gray-600 mt-1">Step {currentStep} of 6</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((step, index) => (
              <React.Fragment key={step}>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {index < 5 && (
                  <div className={`flex-1 h-2 mx-2 rounded-full ${
                    currentStep > step ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Setup</span>
            <span>Upload</span>
            <span>CAPTCHA</span>
            <span>Record</span>
            <span>Training</span>
            <span>Ready</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Important Requirements Box */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-blue-600" />
                  Requirements for Professional Voice
                </h3>
                <div className="space-y-1.5 text-xs text-gray-700">
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span><strong>Minimum 3 audio samples</strong> (up to 25 files allowed)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span><strong>Total duration: ~1 hour</strong> of clear speech (recommended for best quality)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span><strong>Quality matters:</strong> Quiet environment, clear audio, no background noise</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span><strong>Varied content:</strong> Different emotions, tones, and speaking styles</span>
                  </div>
                </div>
              </div>

              {/* Voice Name - Most Important */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Voice Name *
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="e.g., My Professional Voice"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 3 characters
                </p>
              </div>

              {/* Basic Details - Compact Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Language *
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Accent *
                  </label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    {accents.map(acc => (
                      <option key={acc.code} value={acc.code}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Gender *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    {genders.map(g => (
                      <option key={g.code} value={g.code}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Age *
                  </label>
                  <select
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  >
                    {ages.map(a => (
                      <option key={a.code} value={a.code}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description - Collapsed */}
              <details className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <summary className="cursor-pointer text-xs font-medium text-gray-600">
                  + Add Description (Optional)
                </summary>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the intended use for this voice"
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  maxLength={200}
                />
              </details>

              {/* Divider */}
              <div className="border-t border-gray-200 pt-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">
                  Audio Samples ({files.length}/{MIN_FILES} minimum required)
                </h3>

                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 font-medium mb-2">
                    📁 Upload Audio Files
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Drag and drop or click to browse
                  </p>
                  <input
                    type="file"
                    multiple
                    accept={SUPPORTED_FORMATS.join(',')}
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    {SUPPORTED_FORMATS.join(', ')} • Max 50MB
                  </p>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-gray-900">
                      Uploaded Files ({files.length}/{MAX_FILES})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {files.map((file) => (
                        <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg ${
                          file.isRecorded ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <FileAudio className={`w-5 h-5 ${
                                file.isRecorded ? 'text-blue-600' : 'text-purple-600'
                              }`} />
                              {file.isRecorded && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                {file.isRecorded && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    Recorded
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {file.isRecorded ? 'Voice recording' : 'Uploaded file'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Audio preview for recorded files */}
                            {file.isRecorded && file.file instanceof Blob && (
                              <audio 
                                controls 
                                src={URL.createObjectURL(file.file)}
                                className="h-8 w-24"
                              />
                            )}
                            <button
                              onClick={() => removeFile(file.id)}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recording Section */}
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                      <Mic className="w-4 h-4 mr-2 text-red-600" />
                      Or Record Voice Samples
                    </h4>
                    <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                      {files.filter(f => f.isRecorded).length} Recorded
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3">
                    Record directly in your browser - no files needed
                  </p>
                  
                  {/* Recording Controls */}
                  <div className="flex items-center space-x-2">
                    {!isSampleRecording ? (
                      <button
                        onClick={startSampleRecording}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={stopSampleRecording}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <div className="w-2.5 h-2.5 bg-white"></div>
                          <span>Stop</span>
                        </button>
                        <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-2 rounded-lg font-mono text-sm">
                          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                          {formatTime(sampleRecordingTime)}
                        </div>
                      </>
                    )}
                  </div>

                  {isSampleRecording && (
                    <div className="mt-3 bg-red-600 text-white rounded-lg p-2 text-xs">
                      🎤 Recording... Speak clearly for 10-30 seconds
                    </div>
                  )}

                  {/* Tips - Collapsed */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gray-600">
                      💡 Tips & Prompts
                    </summary>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p>• Quiet room • Natural speech • 10-30 sec each</p>
                      <p className="text-gray-500 italic">Try: "Good morning! I'm excited to present today's results."</p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Create</h3>
                <p className="text-gray-600">
                  Your professional voice will be created with {files.length} audio samples.
                  This process may take several minutes.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Voice Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{voiceName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Language:</span>
                    <span className="font-medium">
                      {languages.find(l => l.code === language)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accent:</span>
                    <span className="font-medium">
                      {accents.find(a => a.code === accent)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium">
                      {genders.find(g => g.code === gender)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Age:</span>
                    <span className="font-medium">
                      {ages.find(a => a.code === age)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Audio Samples:</span>
                    <span className="font-medium">{files.length} files</span>
                  </div>
                  {description && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Description:</span>
                      <span className="font-medium">{description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Get CAPTCHA */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Get CAPTCHA</h3>
                <p className="text-gray-600">
                  Your voice has been created successfully. Get a CAPTCHA challenge to verify ownership.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">CAPTCHA Verification</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      We'll provide you with a text challenge that you'll need to read aloud to verify your voice ownership. This is faster than manual verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Record CAPTCHA */}
          {currentStep === 4 && (
            <div className="space-y-5">
              {/* Important Instructions */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-yellow-600" />
                  Important: How to Pass CAPTCHA Verification
                </h3>
                <div className="space-y-1.5 text-xs text-gray-700">
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2">✓</span>
                    <span><strong>Read EXACTLY as shown</strong> - Don't add or skip any words</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2">✓</span>
                    <span><strong>Speak clearly and naturally</strong> - Same voice as your training samples</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2">✓</span>
                    <span><strong>Quiet environment</strong> - No background noise or echo</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2">✓</span>
                    <span><strong>Normal pace</strong> - Not too fast, not too slow</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-yellow-600 mr-2">✓</span>
                    <span><strong>Listen to playback</strong> - Verify quality before submitting</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Zap className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Voice Verification</h3>
                <p className="text-sm text-gray-600">
                  Read the text below to verify your voice ownership
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-3 text-sm">📝 Read This Text Aloud:</h4>
                
                {/* Display CAPTCHA text if available */}
                {captchaData?.captcha_data?.text && (
                  <div className="text-base font-medium bg-white p-4 rounded-lg border-2 border-purple-300 shadow-sm">
                    "{captchaData.captcha_data.text}"
                  </div>
                )}
                
                {/* Display CAPTCHA image if available */}
                {captchaData?.captcha_image && (
                  <div className="bg-white p-3 rounded-lg border-2 border-purple-300 flex justify-center">
                    <img 
                      src={`data:${captchaData.content_type || 'image/png'};base64,${captchaData.captcha_image}`}
                      alt="CAPTCHA Challenge"
                      className="max-w-full h-auto"
                    />
                  </div>
                )}
                
                {/* Display plain text if available */}
                {captchaData?.captcha_text && !captchaData?.captcha_data?.text && (
                  <div className="text-base font-medium bg-white p-4 rounded-lg border-2 border-purple-300 shadow-sm">
                    {captchaData.captcha_text}
                  </div>
                )}
                
                {/* Fallback display */}
                {!captchaData?.captcha_data?.text && !captchaData?.captcha_image && !captchaData?.captcha_text && (
                  <div className="text-base bg-white p-4 rounded-lg border-2 border-gray-300 text-gray-500 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Loading verification text...
                  </div>
                )}
              </div>

              {/* Audio Recording Section */}
              <div className="bg-white rounded-lg border p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Audio Recording</h4>
                
                {/* Recording Controls */}
                <div className="flex items-center space-x-4">
                  {!isRecording && !recordedAudio && (
                    <button
                      onClick={startRecording}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                      <span>Start Recording</span>
                    </button>
                  )}
                  
                  {isRecording && (
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={stopRecording}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <div className="w-3 h-3 bg-white"></div>
                        <span>Stop Recording</span>
                      </button>
                      <div className="flex items-center space-x-2 text-red-600">
                        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                        <span className="font-mono">{formatTime(recordingTime)}</span>
                      </div>
                    </div>
                  )}
                  
                  {recordedAudio && !isRecording && (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Recording ready ({formatTime(recordingTime)})</span>
                      </div>
                      <button
                        onClick={clearRecording}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Audio Playback */}
                {recordedAudio && (
                  <div className="pt-2">
                    <audio 
                      controls 
                      src={URL.createObjectURL(recordedAudio)}
                      className="w-full h-8"
                    />
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Recording Instructions</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Record yourself reading the text above clearly. The system will automatically verify your voice and proceed to training.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Training in Progress */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="relative">
                  <Zap className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-pulse" />
                  <div className="absolute inset-0 w-16 h-16 mx-auto mb-4 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Training Started Successfully</h3>
                <p className="text-gray-600">
                  Your voice training has been queued in our background system and will continue automatically.
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">Background Processing</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Training will continue even if you close this window. The process typically takes 28-48 hours depending on ElevenLabs' queue. Your voice will be ready automatically!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Training Complete */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">Training Started!</h3>
                <p className="text-gray-600 mb-4">
                  Your professional voice is now training. This usually takes 10-20 minutes to complete.
                </p>
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600 mb-2" />
                  <p className="text-sm text-gray-600">
                    You can close this dialog and check back later. Your voice will appear in the Voice Library once training is complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {workflowSuccess && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-700">{workflowSuccess}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            {currentStep === 1 ? (
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2()}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all ${
                  canProceedToStep2()
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentStep === 2 ? (
              <button
                onClick={handleCreateVoice}
                disabled={!canCreateVoice() || isCreating}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all ${
                  canCreateVoice() && !isCreating
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Create Voice</span>
                  </>
                )}
              </button>
            ) : currentStep === 3 ? (
              <button
                onClick={handleGetCaptcha}
                disabled={isProcessingWorkflow}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all ${
                  !isProcessingWorkflow
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessingWorkflow ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Getting CAPTCHA...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Get CAPTCHA</span>
                  </>
                )}
              </button>
            ) : currentStep === 4 ? (
              <button
                onClick={handleSubmitCaptchaRecording}
                disabled={isProcessingWorkflow || !recordedAudio}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-all ${
                  !isProcessingWorkflow && recordedAudio
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessingWorkflow ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{recordedAudio ? 'Submit Recording' : 'Record Audio First'}</span>
                  </>
                )}
              </button>
            ) : currentStep === 5 ? (
              <div className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-green-100 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span>Training started in background</span>
              </div>
            ) : currentStep === 6 ? (
              <button
                onClick={handleFinishWorkflow}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Complete</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
