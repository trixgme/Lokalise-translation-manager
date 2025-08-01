'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Clock, Circle } from 'lucide-react'
import TranslationResults from '@/components/TranslationResults'

interface TranslationKeyFormProps {
  onKeyAdded: () => void
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

export default function TranslationKeyForm({ onKeyAdded }: TranslationKeyFormProps) {
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

  const handlePlatformChange = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
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
        title: 'Input Validation',
        description: 'Validating translation key information and platform settings...',
        status: 'pending'
      },
      {
        id: 'languages',
        title: 'Language Lookup',
        description: 'Fetching supported language list from Lokalise...',
        status: 'pending'
      }
    ]

    if (useAI) {
      steps.push({
        id: 'translation',
        title: 'AI Translation',
        description: 'Generating multilingual translations using OpenAI...',
        status: 'pending',
        progress: 0,
        subSteps: [
          'Preparing target languages',
          'Creating batch translation request',
          'Calling OpenAI API',
          'Validating translation results',
          'Processing translation data'
        ]
      })
    }

    steps.push({
      id: 'creation',
      title: 'Translation Key Creation',
      description: 'Saving translation key and translations to Lokalise...',
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
      // Use Server-Sent Events for real-time progress
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
}