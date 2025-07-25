'use client'

import { useState, useEffect } from 'react'
import { LokaliseKey } from '@/types/lokalise'

interface TranslationListProps {
  refreshTrigger: number
}

export default function TranslationList({ refreshTrigger }: TranslationListProps) {
  const [keys, setKeys] = useState<LokaliseKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchKeys = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/keys')
      
      if (response.ok) {
        const data = await response.json()
        setKeys(data.keys)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch keys')
      }
    } catch (err) {
      setError('An error occurred while fetching keys')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [refreshTrigger])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Translation Keys
        </h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Translation Keys
        </h2>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchKeys}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Translation Keys
        </h2>
        <button
          onClick={fetchKeys}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Refresh
        </button>
      </div>

      {keys.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No translation keys found. Add your first key using the form on the left.
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {keys.map((key) => (
            <div key={key.key_id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">
                  {key.key_name.web || key.key_name.ios || key.key_name.android}
                </h3>
                <span className="text-sm text-gray-500">
                  {key.translations?.length || 0} translations
                </span>
              </div>
              
              {key.description && (
                <p className="text-sm text-gray-600 mb-2">{key.description}</p>
              )}

              <div className="space-y-1">
                {key.translations?.slice(0, 3).map((translation) => (
                  <div key={translation.translation_id} className="flex justify-between text-sm">
                    <span className="font-mono text-blue-600">
                      {translation.language_iso}:
                    </span>
                    <span className="text-gray-700 truncate ml-2 flex-1">
                      {translation.translation}
                    </span>
                  </div>
                ))}
                {key.translations && key.translations.length > 3 && (
                  <div className="text-sm text-gray-500">
                    ... and {key.translations.length - 3} more
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-400">
                Created: {new Date(key.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}