'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle, Lightbulb, FileText } from 'lucide-react'

interface AlternativeVersion {
  text: string
  tone: 'formal' | 'balanced' | 'conversational'
}

interface SourceFeedback {
  has_issues: boolean
  issues?: string[]
  suggestions?: string[]
  alternative_versions?: AlternativeVersion[]
}

export default function SourceTextValidator() {
  const [sourceText, setSourceText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<SourceFeedback | null>(null)

  const handleValidate = async () => {
    if (!sourceText.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/validate-source', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: 'English' // 기본값으로 영어 설정
        }),
      })

      if (!response.ok) {
        throw new Error('Validation failed')
      }

      const result = await response.json()
      setFeedback(result.feedback)
    } catch (error) {
      console.error('Error validating source text:', error)
      // 에러 처리
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setSourceText('')
    setFeedback(null)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <CardTitle>Fintech UX Text Validator</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Balance natural language with professional tone for trusted financial services
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="sourceText" className="text-sm font-medium">
              Money Transfer App Text (English)
            </label>
            <Textarea
              id="sourceText"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter your app text to check for natural yet professional tone...&#10;&#10;Examples:&#10;• 'Transaction completed successfully' &#10;• 'Please verify your identity to continue'&#10;• 'Enter the recipient information'"
              rows={6}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleValidate} 
              disabled={isLoading || !sourceText.trim()}
              className="flex-1"
            >
              {isLoading ? 'Analyzing tone...' : 'Check Professional Tone'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClear}
              disabled={isLoading}
            >
              Clear
            </Button>
          </div>

          {/* Validation Results */}
          {feedback && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {feedback.has_issues ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      Can be more natural yet professional
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-green-700 dark:text-green-300">
                      Perfect! Natural and appropriately professional
                    </span>
                  </>
                )}
              </div>

              {feedback.has_issues && (
                <div className="space-y-4 p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  {feedback.issues && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                          UX Writing Issues:
                        </h4>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {feedback.issues.map((issue, index) => (
                          <li key={index} className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.suggestions && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                          UX Improvements:
                        </h4>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {feedback.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.alternative_versions && feedback.alternative_versions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                        Natural Alternatives (Compare & Choose):
                      </h4>
                      <div className="space-y-3">
                        {feedback.alternative_versions.map((version, index) => {
                          const getToneColor = (tone: string) => {
                            switch (tone) {
                              case 'formal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              case 'balanced': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              case 'conversational': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }
                          }

                          return (
                            <div key={index} className="p-3 bg-amber-100/30 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <Badge className={`text-xs ${getToneColor(version.tone)}`}>
                                  {version.tone.charAt(0).toUpperCase() + version.tone.slice(1)}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSourceText(version.text)}
                                  className="h-6 px-2 text-xs"
                                >
                                  Use This
                                </Button>
                              </div>
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                "{version.text}"
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}