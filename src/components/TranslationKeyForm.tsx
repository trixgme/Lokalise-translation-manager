'use client'

import { useState } from 'react'
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

interface TranslationKeyFormProps {
  onKeyAdded: () => void
}

interface ProgressStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  details?: string
}

const GPT_MODELS = [
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (안정적)', description: '가장 안정적이고 저렴한 모델' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (경제적)', description: '비용 효율적인 소형 모델' },
  { value: 'gpt-4o', label: 'GPT-4o (멀티모달)', description: '빠르고 강력한 GPT-4 모델' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (고성능)', description: '고성능 범용 모델' },
]

export default function TranslationKeyForm({ onKeyAdded }: TranslationKeyFormProps) {
  const [keyName, setKeyName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [tags, setTags] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['ios', 'android'])
  const [isLoading, setIsLoading] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [showProgress, setShowProgress] = useState(false)

  const handlePlatformChange = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const updateStepStatus = (stepId: string, status: ProgressStep['status'], details?: string) => {
    setProgressSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, details } : step
    ))
  }

  const initializeProgressSteps = () => {
    const steps: ProgressStep[] = [
      {
        id: 'validation',
        title: '입력값 검증',
        description: '번역 키 정보와 플랫폼 설정을 확인하는 중...',
        status: 'pending'
      },
      {
        id: 'languages',
        title: '지원 언어 조회',
        description: 'Lokalise에서 지원하는 언어 목록을 가져오는 중...',
        status: 'pending'
      }
    ]

    if (useAI) {
      steps.push({
        id: 'translation',
        title: 'AI 번역 실행',
        description: 'OpenAI를 사용하여 다국어 번역을 생성하는 중...',
        status: 'pending'
      })
    }

    steps.push({
      id: 'creation',
      title: '번역 키 생성',
      description: 'Lokalise에 번역 키와 번역을 저장하는 중...',
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

    try {
      // Step 1: Validation
      updateStepStatus('validation', 'in_progress')
      await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for UX
      
      if (!keyName || !sourceText) {
        updateStepStatus('validation', 'error', '키 이름과 소스 텍스트는 필수입니다.')
        return
      }
      if (platforms.length === 0) {
        updateStepStatus('validation', 'error', '최소 하나의 플랫폼을 선택해야 합니다.')
        return
      }
      updateStepStatus('validation', 'completed', `입력값이 유효합니다. (플랫폼: ${platforms.join(', ')})`)

      // Step 2: Get languages
      updateStepStatus('languages', 'in_progress')
      await new Promise(resolve => setTimeout(resolve, 300))
      updateStepStatus('languages', 'completed', '지원 언어 목록을 성공적으로 가져왔습니다.')

      // Step 3: AI Translation (if enabled)
      if (useAI) {
        updateStepStatus('translation', 'in_progress')
        await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate translation time
      }

      // Step 4: Create key
      updateStepStatus('creation', 'in_progress')

      const response = await fetch('/api/keys', {
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

      if (response.ok) {
        const result = await response.json()
        
        if (useAI) {
          updateStepStatus('translation', 'completed', 'AI 번역이 성공적으로 완료되었습니다.')
        }
        updateStepStatus('creation', 'completed', `번역 키가 성공적으로 생성되었습니다. (ID: ${result.keyId})`)
        
        // Reset form after success
        setTimeout(() => {
          setKeyName('')
          setDescription('')
          setSourceText('')
          setTags('')
          setPlatforms(['ios', 'android'])
          setSelectedModel('gpt-4o-mini')
          setShowProgress(false)
          setProgressSteps([])
          onKeyAdded()
        }, 2000)
        
      } else {
        const error = await response.json()
        if (useAI) {
          updateStepStatus('translation', 'error', 'AI 번역 중 오류가 발생했습니다.')
        }
        updateStepStatus('creation', 'error', `키 생성 실패: ${error.message}`)
      }
    } catch (error) {
      console.error(error)
      // Mark current step as error
      const currentStep = progressSteps.find(step => step.status === 'in_progress')
      if (currentStep) {
        updateStepStatus(currentStep.id, 'error', '예상치 못한 오류가 발생했습니다.')
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
                      <SelectValue placeholder="모델을 선택하세요" />
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
        <Card>
          <CardHeader>
            <CardTitle>생성 진행 상황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressSteps.map((step, index) => (
                <div key={step.id} className="flex items-start space-x-3">
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
                      {step.status === 'in_progress' && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        </div>
                      )}
                    </div>
                    <p className={`text-sm ${
                      step.status === 'error' ? 'text-destructive/80' : 
                      step.status === 'completed' ? 'text-green-600/80 dark:text-green-400/80' :
                      step.status === 'in_progress' ? 'text-blue-600/80 dark:text-blue-400/80' : 'text-muted-foreground'
                    }`}>
                      {step.details || step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}