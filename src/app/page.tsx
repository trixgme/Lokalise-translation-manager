'use client'

import TranslationKeyForm from '@/components/TranslationKeyForm'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'

export default function Home() {
  const handleKeyAdded = () => {
    // Key added handler - can be used for future features
  }

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <LogoutButton />
          <ThemeToggle />
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Lokalise Translation Manager
          </h1>
          <p className="text-lg text-muted-foreground">
            AI-powered translation key management
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <TranslationKeyForm onKeyAdded={handleKeyAdded} />
        </div>
      </div>
    </main>
  )
}