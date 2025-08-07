import { NextRequest, NextResponse } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'

// 키 생성과 스크린샷 업로드 통합 API
export async function POST(request: NextRequest) {
  try {
    console.log('=== Keys with Screenshots API called ===')
    
    // Check content type
    const contentType = request.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)
    
    let keysData
    let screenshots = undefined
    const client = createLokaliseClient()
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (existing file upload)
      const formData = await request.formData()
      console.log('FormData keys:', [...formData.keys()])
      
      const keysDataStr = formData.get('keysData') as string
      if (!keysDataStr) {
        return NextResponse.json(
          { error: 'Keys data is required' },
          { status: 400 }
        )
      }
      
      keysData = JSON.parse(keysDataStr)
      
      // Parse screenshots from FormData
      if (formData.get('screenshots[0][data]')) {
        console.log('Screenshots detected in FormData, parsing...')
        screenshots = []
        let index = 0
        
        while (formData.get(`screenshots[${index}][data]`)) {
          const data = formData.get(`screenshots[${index}][data]`)
          const title = formData.get(`screenshots[${index}][title]`) as string
          const description = formData.get(`screenshots[${index}][description]`) as string
          
          // Convert File to base64 if needed (should not happen in new flow)
          let dataString: string
          if (data instanceof File) {
            throw new Error('File upload not supported. Use JSON-based upload with base64 data.')
          } else {
            dataString = data as string
          }
          
          screenshots.push({
            data: dataString,
            title: title || undefined,
            description: description || undefined,
            key_ids: []
          })
          
          index++
        }
        
        screenshots = { screenshots }
      }
    } else {
      // Handle JSON data
      const body = await request.json()
      console.log('JSON body received:', Object.keys(body))
      
      keysData = body.keysData
      if (body.screenshots && body.screenshots.length > 0) {
        screenshots = { screenshots: body.screenshots }
      }
      
      // Check if AI translation is requested
      const useAI = body.useAI
      const gptModel = body.gptModel
      
      console.log('AI Translation requested:', useAI)
      console.log('GPT Model:', gptModel)
      
      // If AI translation is requested, translate the source text first
      if (useAI && keysData.keys && keysData.keys.length > 0) {
        const sourceKey = keysData.keys[0]
        const sourceText = sourceKey.translations?.[0]?.translation
        
        if (sourceText) {
          console.log('Performing AI translation for source text:', sourceText)
          
          try {
            // Get available languages first
            const languages = await client.getLanguages()
            const targetLanguages = languages
              .filter(lang => lang.lang_iso !== 'en') // Exclude source language
              .map(lang => lang.lang_iso)
            
            console.log('Target languages for translation:', targetLanguages)
            
            // Call translation API
            const translationResponse = await fetch(`${request.nextUrl.origin}/api/translate-text`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                text: sourceText,
                targetLanguages,
                gptModel
              })
            })
            
            if (translationResponse.ok) {
              const translationResults = await translationResponse.json()
              console.log('AI translation successful:', translationResults)
              
              // Add translations to the key data
              const allTranslations = [
                { language_iso: 'en', translation: sourceText }, // Original
                ...Object.entries(translationResults.translations).map(([lang, text]) => ({
                  language_iso: lang,
                  translation: text as string
                }))
              ]
              
              keysData.keys[0].translations = allTranslations
              console.log('✅ AI Translation completed!')
              console.log(`📝 Total translations created: ${allTranslations.length}`)
              console.log('🌍 Languages:', allTranslations.map(t => t.language_iso).join(', '))
            } else {
              const errorText = await translationResponse.text()
              console.warn('❌ AI translation failed:', errorText)
              console.log('Proceeding with original text only')
            }
          } catch (translationError) {
            console.error('AI translation error:', translationError)
            console.log('Proceeding without AI translations')
          }
        }
      }
    }
    
    if (!keysData) {
      return NextResponse.json(
        { error: 'Keys data is required' },
        { status: 400 }
      )
    }
    
    console.log('Final keys data:', JSON.stringify(keysData, null, 2))
    
    if (screenshots) {
      console.log(`Total screenshots: ${screenshots.screenshots.length}`)
    } else {
      console.log('No screenshots provided')
    }
    
    console.log('🚀 Starting integrated key + screenshot creation...')
    const result = await client.createKeysWithScreenshots(keysData, screenshots)
    
    // Success summary
    console.log('🎉 OPERATION COMPLETED SUCCESSFULLY!')
    console.log('📋 FINAL SUMMARY:')
    console.log(`  🔑 Keys created: ${result.keys?.length || 0}`)
    console.log(`  🌍 Translations per key: ${result.keys?.[0]?.translations?.length || 0}`)
    console.log(`  📸 Screenshots uploaded: ${result.screenshots ? 'YES' : 'NO'}`)
    if (result.screenshotError) {
      console.log(`  ⚠️ Screenshot error: ${result.screenshotError}`)
    }
    console.log('==========================================')
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error in keys-with-screenshots API:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: 'Failed to create keys with screenshots',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}