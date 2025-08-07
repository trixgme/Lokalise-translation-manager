'use client'

import { useRef } from 'react'
import TranslationKeyForm from '@/components/TranslationKeyForm'
import SourceTextValidator from '@/components/SourceTextValidator'
import KeyRecommender from '@/components/KeyRecommender'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'

export default function Home() {
  const translationFormRef = useRef<{ setKeyAndText: (key: string, text: string) => void }>(null)

  const handleKeyAdded = () => {
    // Key added handler - can be used for future features
  }

  const handleKeySelect = (key: string, text: string) => {
    // Pass the selected key and text to the TranslationKeyForm
    if (translationFormRef.current) {
      translationFormRef.current.setKeyAndText(key, text)
    }
    
    // Scroll to the form
    document.querySelector('#translation-key-form')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    })
  }

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="container max-w-7xl">
        <div className="flex justify-between items-center mb-4">
          <LogoutButton />
          <ThemeToggle />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 relative overflow-hidden">
            <span className="inline-block bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 via-purple-600 via-pink-500 to-red-500 bg-[length:300%_100%] bg-clip-text text-transparent animate-gradient-flow">
              Lokalise Translation Manager
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered translation key management
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div id="translation-key-form">
              <TranslationKeyForm 
                ref={translationFormRef}
                onKeyAdded={handleKeyAdded} 
              />
            </div>
          </div>
          <div className="space-y-8">
            <SourceTextValidator />
            <KeyRecommender onKeySelect={handleKeySelect} />
          </div>
        </div>
      </div>
    </main>
  )
}