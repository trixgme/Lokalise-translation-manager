'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, Copy, Send, Loader2, CheckCircle } from 'lucide-react'

interface KeyRecommenderProps {
  onKeySelect: (key: string, text: string) => void
}

interface KeyRecommendation {
  key: string
  reasoning: string
  category: string
}

export default function KeyRecommender({ onKeySelect }: KeyRecommenderProps) {
  const [inputText, setInputText] = useState('')
  const [prefix, setPrefix] = useState('')
  const [recommendations, setRecommendations] = useState<KeyRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleGetRecommendations = async () => {
    if (!inputText.trim()) return

    setIsLoading(true)
    setRecommendations([])

    try {
      const response = await fetch('/api/recommend-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText.trim(),
          prefix: prefix.trim()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get key recommendations')
      }

      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error getting key recommendations:', error)
      // You could add error state handling here
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (error) {
      console.error('Failed to copy key:', error)
    }
  }

  const handleUseKey = (key: string) => {
    onKeySelect(key, inputText)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'UI': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'Action': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Navigation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Form': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      'Message': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    }
    return colors[category] || colors['General']
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          Translation Key Recommender
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter English text to get AI-powered translation key recommendations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="input-text">English Text</Label>
            <Textarea
              id="input-text"
              placeholder="Enter the English text you want to create a translation key for...&#10;Example: Welcome to our fintech platform"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix (Optional)</Label>
            <Input
              id="prefix"
              placeholder="e.g., test, home, user"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Keys will start with: <code className="text-xs">{prefix ? `${prefix}_` : 'no prefix'}</code>
            </p>
          </div>
        </div>

        <Button 
          onClick={handleGetRecommendations}
          disabled={!inputText.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Recommendations...
            </>
          ) : (
            <>
              <Lightbulb className="w-4 h-4 mr-2" />
              Get Key Recommendations
            </>
          )}
        </Button>

        {recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <h3 className="font-medium">Recommended Keys</h3>
            </div>
            
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {recommendation.key}
                        </code>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getCategoryColor(recommendation.category)}`}
                        >
                          {recommendation.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.reasoning}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKey(recommendation.key)}
                      className="flex-1"
                    >
                      {copiedKey === recommendation.key ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Key
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUseKey(recommendation.key)}
                      className="flex-1"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Use This Key
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && inputText && recommendations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Click "Get Key Recommendations" to see AI-powered suggestions</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}