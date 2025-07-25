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
          <h1 className="text-3xl font-bold mb-2 relative overflow-hidden">
            <span className="inline-block bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 via-blue-500 via-purple-600 via-pink-500 to-red-500 bg-[length:300%_100%] bg-clip-text text-transparent animate-gradient-flow">
              Lokalise Translation Manager
            </span>
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