import { NextRequest, NextResponse } from 'next/server'
import { batchTranslateWithOpenAI, getLanguageCode } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguages, gptModel = 'gpt-5' } = await request.json()

    console.log('=== Text Translation API called ===')
    console.log('Text to translate:', text)
    console.log('Target languages:', targetLanguages)
    console.log('GPT Model:', gptModel)

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      )
    }

    if (!targetLanguages || !Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return NextResponse.json(
        { error: 'Target languages are required and must be an array' },
        { status: 400 }
      )
    }

    // Convert language codes to format expected by OpenAI
    const targetLanguageObjects = targetLanguages.map(code => ({
      code,
      name: getLanguageCode(code)
    }))

    console.log('Mapped languages:', targetLanguageObjects)

    try {
      console.log('🚀 Starting batch translation with OpenAI...')
      
      const translations = await batchTranslateWithOpenAI({
        text,
        sourceLang: 'English', // Source is always English
        targetLanguages: targetLanguageObjects,
        model: gptModel,
        onProgress: (step, progress, details) => {
          console.log(`Translation progress: ${step} (${progress}%) - ${details}`)
        }
      })

      console.log('✅ Batch translation completed successfully!')
      console.log('Translation results:', translations)

      return NextResponse.json({
        success: true,
        translations,
        model: gptModel,
        sourceText: text,
        targetLanguageCount: targetLanguages.length
      })

    } catch (translationError: any) {
      console.error('❌ OpenAI translation failed:', translationError)
      return NextResponse.json(
        { 
          error: 'Translation failed',
          details: translationError.message,
          model: gptModel
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Text translation API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    )
  }
}