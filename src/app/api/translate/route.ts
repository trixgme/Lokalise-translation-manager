import { NextRequest, NextResponse } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'
import { translateWithOpenAI, getLanguageCode } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { keyIds, sourceLang = 'en', targetLangs, useOpenAI = false } = await request.json()

    if (!keyIds || !Array.isArray(keyIds) || keyIds.length === 0) {
      return NextResponse.json(
        { message: 'Key IDs are required' },
        { status: 400 }
      )
    }

    if (!targetLangs || !Array.isArray(targetLangs) || targetLangs.length === 0) {
      return NextResponse.json(
        { message: 'Target languages are required' },
        { status: 400 }
      )
    }

    const lokalise = createLokaliseClient()
    const results = []

    if (useOpenAI) {
      // OpenAI를 사용한 번역
      const keys = await lokalise.getKeys()
      
      for (const keyId of keyIds) {
        const key = keys.find(k => k.key_id === keyId)
        if (!key) continue

        const sourceTranslation = key.translations?.find(t => t.language_iso === sourceLang)
        if (!sourceTranslation) continue

        const keyResult = {
          keyId,
          keyName: key.key_name.web || key.key_name.ios || key.key_name.android,
          translations: [] as Array<{
            language: string;
            translation: string | null;
            success: boolean;
            error?: string;
          }>
        }

        for (const targetLang of targetLangs) {
          try {
            const translatedText = await translateWithOpenAI({
              text: sourceTranslation.translation,
              sourceLang: getLanguageCode(sourceLang),
              targetLang: getLanguageCode(targetLang),
              context: key.description
            })

            await lokalise.updateTranslation(keyId, targetLang, translatedText)
            
            keyResult.translations.push({
              language: targetLang,
              translation: translatedText,
              success: true
            })
          } catch (error) {
            keyResult.translations.push({
              language: targetLang,
              translation: null,
              success: false,
              error: error instanceof Error ? error.message : 'Translation failed'
            })
          }
        }

        results.push(keyResult)
      }
    } else {
      // Lokalise AI를 사용한 번역
      try {
        const response = await lokalise.translateKeys({
          source_lang_iso: sourceLang,
          target_lang_isos: targetLangs,
          keys: keyIds
        })

        results.push({
          success: true,
          message: 'Lokalise AI translation completed',
          response
        })
      } catch (error) {
        return NextResponse.json(
          { message: 'Lokalise AI translation failed', error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      message: 'Translation completed',
      results
    })

  } catch (error) {
    console.error('Error in translation:', error)
    return NextResponse.json(
      { message: 'Translation failed' },
      { status: 500 }
    )
  }
}