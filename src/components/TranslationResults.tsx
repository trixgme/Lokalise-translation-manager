'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Globe, X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Translation {
  language: string
  translation: string
  success: boolean
  error?: string
}

interface TranslationResult {
  keyId: string
  keyName: string
  sourceText: string
  translations: Translation[]
}

interface TranslationResultsProps {
  results: TranslationResult | null
  onClose: () => void
}

export default function TranslationResults({ results, onClose }: TranslationResultsProps) {
  if (!results) return null

  const successCount = results.translations.filter(t => t.success).length
  const totalCount = results.translations.length

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle>Translation Results</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={successCount === totalCount ? "default" : "secondary"}>
              {successCount} / {totalCount} translated
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p><span className="font-medium">Key:</span> {results.keyName}</p>
          <p><span className="font-medium">Source:</span> {results.sourceText}</p>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {results.translations.map((translation, index) => (
              <div 
                key={`${translation.language}-${index}`}
                className={`p-4 rounded-lg border ${
                  translation.success 
                    ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {translation.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="font-medium text-sm">
                        {translation.language.toUpperCase()}
                      </span>
                    </div>
                    {translation.success ? (
                      <p className="text-sm text-foreground/90 break-words">
                        {translation.translation}
                      </p>
                    ) : (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {translation.error || 'Translation failed'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}