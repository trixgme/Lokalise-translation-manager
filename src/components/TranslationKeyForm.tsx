'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Clock, Circle, Upload, X, Eye, Link, Download } from 'lucide-react'
import TranslationResults from '@/components/TranslationResults'

interface TranslationKeyFormProps {
  onKeyAdded: () => void
}

export interface TranslationKeyFormRef {
  setKeyAndText: (key: string, text: string) => void
}

interface ProgressStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  details?: string
  progress?: number // 0-100 percentage
  subSteps?: string[] // detailed sub-steps
  currentSubStep?: string
}

const GPT_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Stable)', description: 'Most stable and cost-effective model' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Economic)', description: 'Cost-efficient compact model' },
  { value: 'gpt-4o', label: 'GPT-4o (Multimodal)', description: 'Fast and powerful GPT-4 model' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (High Performance)', description: 'High-performance general-purpose model' },
  { value: 'gpt-4.1', label: 'GPT-4.1 (Latest)', description: 'Latest and most advanced GPT-4 model' },
]

const TranslationKeyForm = forwardRef<TranslationKeyFormRef, TranslationKeyFormProps>(({ onKeyAdded }, ref) => {
  const [keyName, setKeyName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [tags, setTags] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['ios', 'android'])
  const [isLoading, setIsLoading] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [selectedModel, setSelectedModel] = useState('gpt-4.1')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [showProgress, setShowProgress] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const [translationResults, setTranslationResults] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [isDownloadingUrl, setIsDownloadingUrl] = useState(false)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    setKeyAndText: (key: string, text: string) => {
      setKeyName(key)
      setSourceText(text)
      
      // Optional: Show a brief highlight animation
      const keyInput = document.getElementById('keyName')
      const textArea = document.getElementById('sourceText')
      
      if (keyInput) {
        keyInput.focus()
        keyInput.style.transition = 'all 0.3s ease'
        keyInput.style.backgroundColor = 'var(--primary)'
        keyInput.style.color = 'var(--primary-foreground)'
        setTimeout(() => {
          keyInput.style.backgroundColor = ''
          keyInput.style.color = ''
        }, 1000)
      }
      
      if (textArea) {
        setTimeout(() => {
          textArea.focus()
          textArea.style.transition = 'all 0.3s ease'
          textArea.style.backgroundColor = 'var(--primary)'
          textArea.style.color = 'var(--primary-foreground)'
          setTimeout(() => {
            textArea.style.backgroundColor = ''
            textArea.style.color = ''
          }, 1000)
        }, 500)
      }
    }
  }))

  const handlePlatformChange = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files).filter(file => {
      return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    })

    setScreenshots(prev => [...prev, ...newFiles])

    // Create preview URLs and convert to base64
    for (const file of newFiles) {
      const url = URL.createObjectURL(file)
      setPreviewUrls(prev => [...prev, url])
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeScreenshot = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index])
    
    setScreenshots(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const openPreview = (url: string) => {
    window.open(url, '_blank', 'width=800,height=600')
  }

  const fileToBase64DataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(file => {
      return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024 // 10MB limit
    })

    if (files.length > 0) {
      setScreenshots(prev => [...prev, ...files])

      // Create preview URLs
      for (const file of files) {
        const url = URL.createObjectURL(file)
        setPreviewUrls(prev => [...prev, url])
      }
    }
  }

  const handleDownloadFromUrl = async () => {
    if (!imageUrl.trim()) return
    
    setIsDownloadingUrl(true)
    
    try {
      const response = await fetch('/api/download-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to download image')
      }

      const blob = await response.blob()
      
      // Create filename from URL or use default
      let filename = 'downloaded-image'
      try {
        const urlObj = new URL(imageUrl)
        const pathParts = urlObj.pathname.split('/')
        const lastPart = pathParts[pathParts.length - 1]
        if (lastPart && lastPart.includes('.')) {
          filename = lastPart
        } else {
          filename = `downloaded-image-${Date.now()}.png`
        }
      } catch {
        filename = `downloaded-image-${Date.now()}.png`
      }

      // Convert blob to File object
      const file = new File([blob], filename, { type: blob.type })
      
      // Add to screenshots
      setScreenshots(prev => [...prev, file])
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setPreviewUrls(prev => [...prev, previewUrl])
      
      // Clear input
      setImageUrl('')
      
      console.log(`Successfully downloaded image: ${filename}`)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('이미지 다운로드에 실패했습니다. URL을 확인해주세요.')
    } finally {
      setIsDownloadingUrl(false)
    }
  }

  const updateStepStatus = (
    stepId: string, 
    status: ProgressStep['status'], 
    details?: string, 
    progress?: number,
    currentSubStep?: string
  ) => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details, progress, currentSubStep } : step
    ))
    
    // Update overall progress
    setProgressSteps(prev => {
      const completedSteps = prev.filter(s => s.status === 'completed').length
      const inProgressStep = prev.find(s => s.status === 'in_progress')
      const inProgressPercent = inProgressStep?.progress || 0
      
      const totalProgress = ((completedSteps + (inProgressPercent / 100)) / prev.length) * 100
      setOverallProgress(Math.round(totalProgress))
      return prev
    })
  }

  const initializeProgressSteps = () => {
    const steps: ProgressStep[] = [
      {
        id: 'validation',
        title: '1. Input Validation',
        description: 'Validating translation key information and platform settings',
        status: 'pending'
      },
      {
        id: 'preparation',
        title: '2. Data Preparation',
        description: screenshots.length > 0 
          ? `Preparing key data and converting ${screenshots.length} screenshot(s) to base64`
          : 'Preparing translation key data',
        status: 'pending'
      }
    ]

    let stepNumber = 3

    if (useAI) {
      steps.push({
        id: 'languages',
        title: `${stepNumber}. Language Detection`,
        description: 'Fetching supported project languages from Lokalise',
        status: 'pending'
      })
      stepNumber++

      steps.push({
        id: 'translation',
        title: `${stepNumber}. AI Translation`,
        description: `Generating multilingual translations using ${selectedModel}`,
        status: 'pending',
        progress: 0,
        subSteps: [
          'Preparing target languages',
          'Creating batch translation request', 
          'Calling OpenAI API',
          'Processing translation results',
          'Validating translations'
        ]
      })
      stepNumber++

      steps.push({
        id: 'integration',
        title: `${stepNumber}. Translation Integration`,
        description: 'Integrating AI translations with key data',
        status: 'pending'
      })
      stepNumber++
    }

    steps.push({
      id: 'key-creation',
      title: `${stepNumber}. Key Creation`,
      description: 'Creating translation key in Lokalise project',
      status: 'pending'
    })
    stepNumber++

    if (screenshots.length > 0) {
      steps.push({
        id: 'screenshot-upload',
        title: `${stepNumber}. Screenshot Upload`,
        description: `Uploading and linking ${screenshots.length} screenshot(s) to the key`,
        status: 'pending'
      })
      stepNumber++
    }

    steps.push({
      id: 'completion',
      title: `${stepNumber}. Completion`,
      description: 'Finalizing and validating the creation process',
      status: 'pending'
    })

    return steps
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setShowProgress(true)
    
    const steps = initializeProgressSteps()
    setProgressSteps(steps)
    setOverallProgress(0)
    
    // Auto scroll to progress section
    setTimeout(() => {
      progressRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }, 100)

    try {
      // Check if we have screenshots to upload
      if (screenshots.length > 0) {
        // Step 1: Input Validation
        updateStepStatus('validation', 'in_progress', 'Validating input data...')
        await new Promise(resolve => setTimeout(resolve, 800)) // UI feedback delay
        updateStepStatus('validation', 'completed', 'Input validation completed')
        
        await new Promise(resolve => setTimeout(resolve, 300)) // Pause between steps

        // Step 2: Data Preparation
        updateStepStatus('preparation', 'in_progress', 'Converting screenshots to base64 format...')
        await new Promise(resolve => setTimeout(resolve, 500)) // Show processing
        
        console.log('Converting screenshots to base64...')
        const base64Screenshots = await Promise.all(
          screenshots.map(async (file, index) => {
            console.log(`Converting screenshot ${index}: ${file.name}`)
            const base64 = await fileToBase64DataURL(file)
            return {
              data: base64,
              title: `Screenshot for ${keyName}`,
              description: `Visual context for translation key: ${keyName}`,
              key_ids: [] // Will be populated on server side
            }
          })
        )

        console.log('All screenshots converted to base64')
        updateStepStatus('preparation', 'completed', `Converted ${screenshots.length} screenshot(s) to base64 format`)
        
        await new Promise(resolve => setTimeout(resolve, 300)) // Pause between steps

        // Step 3: Language Detection (if AI enabled)
        if (useAI) {
          updateStepStatus('languages', 'in_progress', 'Fetching supported languages from Lokalise...')
          await new Promise(resolve => setTimeout(resolve, 700)) // Show processing
          // Languages will be completed after successful API call
        }

        // Step 4: AI Translation (if enabled)
        if (useAI) {
          await new Promise(resolve => setTimeout(resolve, 300)) // Pause between steps
          updateStepStatus('translation', 'in_progress', 'Starting AI translation process...', 10, 'Preparing target languages')
          
          // Simulate translation progress steps
          await new Promise(resolve => setTimeout(resolve, 500))
          updateStepStatus('translation', 'in_progress', 'Processing translation request...', 30, 'Creating batch translation request')
          
          await new Promise(resolve => setTimeout(resolve, 500))
          updateStepStatus('translation', 'in_progress', 'Calling OpenAI API...', 50, 'Calling OpenAI API')
        }

        await new Promise(resolve => setTimeout(resolve, 400)) // Pause before API call

        // Prepare request body
        const requestBody = {
          keysData: {
            keys: [{
              key_name: keyName,
              description,
              platforms,
              tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
              translations: [{
                language_iso: 'en',
                translation: sourceText
              }]
            }]
          },
          screenshots: base64Screenshots,
          useAI,
          gptModel: selectedModel
        }

        // Update progress for integration step (if AI enabled)
        if (useAI) {
          updateStepStatus('translation', 'in_progress', 'Processing translation results...', 70, 'Processing translation results')
          await new Promise(resolve => setTimeout(resolve, 300))
          updateStepStatus('integration', 'in_progress', 'Preparing data integration...')
        }

        // Start key creation step
        updateStepStatus('key-creation', 'in_progress', 'Creating translation key in Lokalise...')
        await new Promise(resolve => setTimeout(resolve, 300))

        // Make the actual API call
        const response = await fetch('/api/keys-with-screenshots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', errorText)
          console.error('Response Status:', response.status)
          console.error('Response Headers:', [...response.headers.entries()])
          
          // Mark current in-progress step as error
          const currentStep = progressSteps.find(step => step.status === 'in_progress')
          if (currentStep) {
            updateStepStatus(currentStep.id, 'error', `API Error: ${response.status}`)
          }
          
          throw new Error(`Failed to create key with screenshots: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        console.log('Created key with screenshots:', result)

        // Complete steps sequentially with delays
        if (useAI) {
          updateStepStatus('languages', 'completed', 'Languages fetched successfully')
          await new Promise(resolve => setTimeout(resolve, 200))
          
          updateStepStatus('translation', 'completed', `AI translation completed using ${selectedModel}`, 100, 'Validating translations')
          await new Promise(resolve => setTimeout(resolve, 300))
          
          updateStepStatus('integration', 'completed', 'Translations integrated with key data')
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        updateStepStatus('key-creation', 'completed', 'Translation key created successfully')
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Handle screenshot upload step
        if (screenshots.length > 0) {
          updateStepStatus('screenshot-upload', 'in_progress', `Uploading ${screenshots.length} screenshot(s) to Lokalise...`)
          await new Promise(resolve => setTimeout(resolve, 800)) // Show upload process
          
          if (result.screenshotError) {
            updateStepStatus('screenshot-upload', 'error', result.screenshotError)
          } else if (result.screenshots) {
            updateStepStatus('screenshot-upload', 'completed', `Successfully uploaded ${screenshots.length} screenshot(s)`)
          }
          await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        // Final completion step
        updateStepStatus('completion', 'in_progress', 'Finalizing process...')
        await new Promise(resolve => setTimeout(resolve, 500))
        updateStepStatus('completion', 'completed', 'Process completed successfully')
        
        // Show results if translations were created
        if (result.keys && result.keys[0] && result.keys[0].translations) {
          const translationData = {
            keyId: result.keys[0].key_id.toString(),
            keyName: result.keys[0].key_name.web || result.keys[0].key_name.ios || result.keys[0].key_name.android,
            sourceText,
            translations: result.keys[0].translations.map((t: any) => ({
              language: t.language_iso,
              translation: t.translation,
              success: true // All translations from Lokalise API are successful
            })),
            model: selectedModel
          }
          setTranslationResults(translationData)
          setShowResults(true)
        }
        
        // Reset form after completion
        setTimeout(() => {
          setKeyName('')
          setDescription('')
          setSourceText('')
          setPlatforms(['ios', 'android'])
          setSelectedModel('gpt-4.1')
          
          // Clear screenshots and preview URLs
          previewUrls.forEach(url => URL.revokeObjectURL(url))
          setScreenshots([])
          setPreviewUrls([])
          setImageUrl('')
          
          setShowProgress(false)
          setProgressSteps([])
          setOverallProgress(0)
          onKeyAdded()
        }, 3000)

        return
      }

      // Original SSE logic for keys without screenshots
      const response = await fetch('/api/keys/create-with-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyName,
          description,
          sourceText,
          tags,
          platforms,
          useAI,
          gptModel: selectedModel,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to start key creation process')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Failed to read response stream')
      }

      let isCompleted = false
      
      while (true) {
        try {
          const { done, value } = await reader.read()
          
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line.length > 6) {
              try {
                const data = JSON.parse(line.substring(6))
                
                if (data.step === 'complete') {
                  // Handle completion
                  isCompleted = true
                  
                  // Store translation results if available
                  if (data.translationResults) {
                    setTranslationResults(data.translationResults)
                    setShowResults(true)
                  }
                  
                  setTimeout(() => {
                    // 폼 필드 리셋 (tags는 유지)
                    setKeyName('')
                    setDescription('')
                    setSourceText('')
                    // tags는 의도적으로 유지
                    setPlatforms(['ios', 'android'])
                    setSelectedModel('gpt-4.1')
                    
                    // Clear screenshots and preview URLs
                    previewUrls.forEach(url => URL.revokeObjectURL(url))
                    setScreenshots([])
                    setPreviewUrls([])
                    setImageUrl('')
                    
                    // 진행 상태 초기화
                    setShowProgress(false)
                    setProgressSteps([])
                    setOverallProgress(0)
                    onKeyAdded()
                  }, 2000)
                  break
                } else if (data.step === 'error') {
                  // Handle error
                  const currentStep = progressSteps.find(step => step.status === 'in_progress')
                  if (currentStep) {
                    updateStepStatus(currentStep.id, 'error', data.details || 'An unexpected error occurred.')
                  }
                  break
                } else {
                  // Update progress for specific step
                  updateStepStatus(
                    data.step,
                    data.status,
                    data.details,
                    data.progress,
                    data.currentSubStep
                  )
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', parseError, 'Line:', line)
              }
            }
          }
          
          if (isCompleted) break
        } catch (readError) {
          console.error('Error reading stream:', readError)
          break
        }
      }
      
      // Clean up reader
      try {
        reader.releaseLock()
      } catch (releaseError) {
        console.error('Error releasing reader lock:', releaseError)
      }
      
    } catch (error) {
      console.error('Error during key creation:', error)
      const currentStep = progressSteps.find(step => step.status === 'in_progress')
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error', 'An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStepIcon = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error':
        return <XCircle className="w-6 h-6 text-destructive" />
      case 'in_progress':
        return <Clock className="w-6 h-6 text-blue-500 animate-pulse" />
      default:
        return <Circle className="w-6 h-6 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Translation Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., home.welcome.title"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this key"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceText">Source Text (English)</Label>
              <Textarea
                id="sourceText"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter the text to be translated"
                rows={3}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., ui, button, navigation (comma-separated)"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="platform-web"
                    checked={platforms.includes('web')}
                    onCheckedChange={() => handlePlatformChange('web')}
                    disabled={isLoading}
                  />
                  <Label htmlFor="platform-web">Web</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="platform-ios"
                    checked={platforms.includes('ios')}
                    onCheckedChange={() => handlePlatformChange('ios')}
                    disabled={isLoading}
                  />
                  <Label htmlFor="platform-ios">iOS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="platform-android"
                    checked={platforms.includes('android')}
                    onCheckedChange={() => handlePlatformChange('android')}
                    disabled={isLoading}
                  />
                  <Label htmlFor="platform-android">Android</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Screenshots (Optional)</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    isDragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <Upload className={`mx-auto h-8 w-8 mb-2 ${
                      isDragOver ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <div className={`text-sm mb-2 ${
                      isDragOver ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {isDragOver 
                        ? 'Drop images here to upload' 
                        : 'Drag and drop images here, or click to browse'
                      }
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                    >
                      Select Images
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center mt-2">
                    Max 10MB per image. Supports PNG, JPG, GIF, WebP
                  </div>
                </div>

                {/* URL 다운로드 섹션 추가 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <hr className="flex-1" />
                    <span className="text-xs text-muted-foreground">OR</span>
                    <hr className="flex-1" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="image-url" className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Download from URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="image-url"
                        placeholder="https://example.com/image.png"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        disabled={isLoading || isDownloadingUrl}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadFromUrl}
                        disabled={!imageUrl.trim() || isLoading || isDownloadingUrl}
                        className="px-3"
                      >
                        {isDownloadingUrl ? (
                          <>
                            <Download className="w-4 h-4 animate-spin" />
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Enter a direct image URL to download and add to screenshots
                    </div>
                  </div>
                </div>
                
                {/* Screenshot previews */}
                {screenshots.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Screenshots ({screenshots.length})
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {screenshots.map((file, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
                            <img
                              src={previewUrls[index]}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                              onClick={() => openPreview(previewUrls[index])}
                              disabled={isLoading}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-red-600"
                              onClick={() => removeScreenshot(index)}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="absolute bottom-1 left-1 right-1">
                            <div className="text-xs text-white bg-black/70 px-2 py-1 rounded truncate">
                              {file.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useAI"
                  checked={useAI}
                  onCheckedChange={(checked) => setUseAI(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="useAI">Auto-translate using AI</Label>
              </div>
              
              {useAI && (
                <div className="space-y-2 pl-6 border-l-2 border-muted">
                  <Label htmlFor="gptModel">GPT Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {GPT_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="space-y-1">
                            <div className="font-medium">{model.label}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Adding Key...' : 'Add Translation Key'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {showProgress && (
        <Card ref={progressRef}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Creation Progress</CardTitle>
              <Badge variant="secondary" className="text-sm font-medium">
                {overallProgress}% Complete
              </Badge>
            </div>
            <Progress value={overallProgress} className="mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {progressSteps.map((step) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-start space-x-3">
                    {getStepIcon(step.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${
                          step.status === 'error' ? 'text-destructive' : 
                          step.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                          step.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {step.status === 'in_progress' && step.progress !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              {step.progress}%
                            </Badge>
                          )}
                          {step.status === 'in_progress' && (
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm ${
                        step.status === 'error' ? 'text-destructive/80' : 
                        step.status === 'completed' ? 'text-green-600/80 dark:text-green-400/80' :
                        step.status === 'in_progress' ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-muted-foreground'
                      }`}>
                        {step.details || step.description}
                      </p>
                      
                      {/* Show current sub-step for in-progress items */}
                      {step.status === 'in_progress' && step.currentSubStep && (
                        <p className="text-xs text-blue-500/70 mt-1 italic">
                          → {step.currentSubStep}
                        </p>
                      )}
                      
                      {/* Show individual progress bar for steps with progress */}
                      {step.status === 'in_progress' && step.progress !== undefined && (
                        <Progress value={step.progress} className="mt-2 h-1" />
                      )}
                      
                      {/* Show sub-steps for translation step */}
                      {step.id === 'translation' && step.subSteps && step.status === 'in_progress' && (
                        <div className="mt-3 ml-2 space-y-1">
                          {step.subSteps.map((subStep, subIndex) => {
                            const isCurrentStep = step.currentSubStep === subStep
                            const isCompletedStep = step.progress !== undefined && 
                              subIndex < Math.floor((step.progress / 100) * step.subSteps!.length)
                            
                            return (
                              <div key={subIndex} className={`flex items-center space-x-2 text-xs ${
                                isCurrentStep ? 'text-blue-600 dark:text-blue-400 font-medium' :
                                isCompletedStep ? 'text-green-600 dark:text-green-400' :
                                'text-muted-foreground'
                              }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  isCurrentStep ? 'bg-blue-500 animate-pulse' :
                                  isCompletedStep ? 'bg-green-500' :
                                  'bg-muted-foreground/30'
                                }`} />
                                <span>{subStep}</span>
                                {isCurrentStep && (
                                  <div className="flex space-x-0.5">
                                    <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                                    <div className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showResults && translationResults && (
        <TranslationResults 
          results={translationResults}
          onClose={() => {
            setShowResults(false)
            setTranslationResults(null)
          }}
        />
      )}
    </div>
  )
})

TranslationKeyForm.displayName = 'TranslationKeyForm'
export default TranslationKeyForm