import { NextRequest, NextResponse } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'
import { translateWithOpenAI, getLanguageCode, batchTranslateWithOpenAI } from '@/lib/openai'

export async function GET() {
  try {
    const lokalise = createLokaliseClient()
    const keys = await lokalise.getKeys()
    
    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Error fetching keys:', error)
    return NextResponse.json(
      { message: 'Failed to fetch keys' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { keyName, description, sourceText, tags, platforms, useAI, gptModel } = await request.json()

    if (!keyName || !sourceText) {
      return NextResponse.json(
        { message: 'Key name and source text are required' },
        { status: 400 }
      )
    }

    const lokalise = createLokaliseClient()

    // 지원하는 언어 목록 가져오기
    const languages = await lokalise.getLanguages()

    // 1. 모든 언어의 번역을 포함하여 키 생성
    let keyTranslations = [{
      language_iso: 'en',
      translation: sourceText
    }]

    // AI 번역이 활성화된 경우 모든 언어 번역을 먼저 생성
    if (useAI) {
      console.log('Starting OpenAI batch translation before key creation...')
      console.log('Selected GPT model:', gptModel || 'gpt-4o-mini')
      try {
        const targetLanguagesForBatch = languages.filter(lang => lang.lang_iso !== 'en').map(lang => ({
          code: lang.lang_iso,
          name: getLanguageCode(lang.lang_iso)
        }))

        console.log('Target languages for batch translation:', targetLanguagesForBatch)
        
        const batchTranslations = await batchTranslateWithOpenAI({
          text: sourceText,
          sourceLang: getLanguageCode('en'),
          targetLanguages: targetLanguagesForBatch,
          context: description,
          model: gptModel || 'gpt-4o-mini'
        })

        // 번역 결과를 키 생성에 포함
        for (const [langCode, translation] of Object.entries(batchTranslations)) {
          keyTranslations.push({
            language_iso: langCode,
            translation: translation
          })
        }
        console.log(`Prepared ${keyTranslations.length} translations for key creation`)
      } catch (translationError) {
        console.warn('Batch translation failed, trying individual translations:', translationError)
        
        // 배치 번역이 실패한 경우 개별 번역으로 폴백
        try {
          const targetLanguagesForIndividual = languages.filter(lang => lang.lang_iso !== 'en').slice(0, 5) // 처음 5개 언어만
          
          for (const lang of targetLanguagesForIndividual) {
            try {
              const translation = await translateWithOpenAI({
                text: sourceText,
                sourceLang: getLanguageCode('en'),
                targetLang: getLanguageCode(lang.lang_iso),
                context: description,
                model: gptModel || 'gpt-4o-mini'
              })
              
              keyTranslations.push({
                language_iso: lang.lang_iso,
                translation: translation
              })
              console.log(`Individual translation successful for ${lang.lang_iso}`)
            } catch (individualError) {
              console.error(`Individual translation failed for ${lang.lang_iso}:`, individualError)
            }
          }
        } catch (fallbackError) {
          console.warn('Individual translation fallback also failed:', fallbackError)
        }
      }
    }

    // Process tags - convert comma-separated string to array
    const tagArray = tags ? tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
    
    const createdKeys = await lokalise.createKeys({
      keys: [{
        key_name: keyName,
        description: description || '',
        platforms: platforms || ['web'],
        tags: tagArray,
        translations: keyTranslations
      }]
    })

    if (!createdKeys || createdKeys.length === 0) {
      return NextResponse.json(
        { message: 'Failed to create key' },
        { status: 500 }
      )
    }

    const keyId = createdKeys[0].key_id
    console.log(`Key created successfully with ID: ${keyId} and ${keyTranslations.length} translations`)

    return NextResponse.json({ 
      message: 'Key created successfully',
      keyId,
      translated: useAI
    })

  } catch (error) {
    console.error('Error creating key:', error)
    
    // 더 자세한 오류 정보 제공
    let errorMessage = 'Failed to create key'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { message: errorMessage, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}