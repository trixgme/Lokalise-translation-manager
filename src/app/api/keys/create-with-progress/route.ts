import { NextRequest } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'
import { translateWithOpenAI, getLanguageCode, batchTranslateWithOpenAI } from '@/lib/openai'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Parse request body before creating stream
  let requestData: any
  try {
    requestData = await request.json()
  } catch (error) {
    return new Response('Invalid JSON', { status: 400 })
  }
  
  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false
      
      const safeEnqueue = (data: string) => {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(data))
          } catch (error) {
            console.error('Error enqueueing data:', error)
          }
        }
      }
      
      const safeClose = () => {
        if (!isClosed) {
          isClosed = true
          try {
            controller.close()
          } catch (error) {
            console.error('Error closing controller:', error)
          }
        }
      }
      
      // Helper function to send progress updates
      const sendProgress = (step: string, status: 'pending' | 'in_progress' | 'completed' | 'error', progress?: number, details?: string, currentSubStep?: string) => {
        const data = JSON.stringify({
          step,
          status,
          progress,
          details,
          currentSubStep,
          timestamp: new Date().toISOString()
        })
        safeEnqueue(`data: ${data}\n\n`)
      }
      
      // Start async processing
      ;(async () => {
        try {
          const { keyName, description, sourceText, tags, platforms, useAI, gptModel } = requestData

          if (!keyName || !sourceText) {
            sendProgress('validation', 'error', 0, '키 이름과 소스 텍스트는 필수입니다.')
            safeClose()
            return
          }

          if (!platforms || platforms.length === 0) {
            sendProgress('validation', 'error', 0, '최소 하나의 플랫폼을 선택해야 합니다.')
            safeClose()
            return
          }

          // Step 1: Validation
          sendProgress('validation', 'in_progress', 50, '입력값을 검증하고 있습니다...')
          await new Promise(resolve => setTimeout(resolve, 500))
          sendProgress('validation', 'completed', 100, `입력값이 유효합니다. (플랫폼: ${platforms.join(', ')})`)

          // Step 2: Get languages
          sendProgress('languages', 'in_progress', 50, 'Lokalise에서 지원하는 언어 목록을 가져오고 있습니다...')
          const lokalise = createLokaliseClient()
          const languages = await lokalise.getLanguages()
          sendProgress('languages', 'completed', 100, `${languages.length}개 언어를 확인했습니다.`)

          // Initialize translations with English source
          let keyTranslations = [{
            language_iso: 'en',
            translation: sourceText
          }]

          // Step 3: AI Translation (if enabled)
          if (useAI) {
            sendProgress('translation', 'in_progress', 0, '번역 과정을 시작합니다...', '번역 대상 언어 준비')
            
            try {
              const targetLanguagesForBatch = languages.filter(lang => lang.lang_iso !== 'en').map(lang => ({
                code: lang.lang_iso,
                name: getLanguageCode(lang.lang_iso)
              }))

              // Progress callback for batch translation
              const onProgress = (currentSubStep: string, progress: number, details?: string) => {
                sendProgress('translation', 'in_progress', progress, details, currentSubStep)
              }
              
              const batchTranslations = await batchTranslateWithOpenAI({
                text: sourceText,
                sourceLang: getLanguageCode('en'),
                targetLanguages: targetLanguagesForBatch,
                context: description,
                model: gptModel || 'gpt-4o-mini',
                onProgress
              })

              // Add translations to keyTranslations
              for (const [langCode, translation] of Object.entries(batchTranslations)) {
                keyTranslations.push({
                  language_iso: langCode,
                  translation: translation
                })
              }
              
              sendProgress('translation', 'completed', 100, `${keyTranslations.length - 1}개 언어로 번역이 완료되었습니다.`)
              
            } catch (translationError) {
              console.warn('Batch translation failed, trying individual translations:', translationError)
              sendProgress('translation', 'in_progress', 50, '배치 번역이 실패했습니다. 개별 번역으로 진행합니다...', '개별 번역 준비')
              
              try {
                const targetLanguagesForIndividual = languages.filter(lang => lang.lang_iso !== 'en').slice(0, 5)
                
                for (let i = 0; i < targetLanguagesForIndividual.length; i++) {
                  const lang = targetLanguagesForIndividual[i]
                  const progress = 50 + ((i + 1) / targetLanguagesForIndividual.length) * 50
                  
                  try {
                    sendProgress('translation', 'in_progress', progress, `${lang.lang_iso} 번역 중...`, `${lang.lang_iso}로 개별 번역`)
                    
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
                  } catch (individualError) {
                    console.error(`Individual translation failed for ${lang.lang_iso}:`, individualError)
                    sendProgress('translation', 'in_progress', progress, `${lang.lang_iso} 번역 실패, 다음 언어로 진행합니다.`)
                  }
                }
                
                sendProgress('translation', 'completed', 100, `개별 번역으로 ${keyTranslations.length - 1}개 언어 번역 완료`)
              } catch (fallbackError) {
                sendProgress('translation', 'error', 0, '개별 번역도 실패했습니다.')
                safeClose()
                return
              }
            }
          }

          // Step 4: Create key in Lokalise
          sendProgress('creation', 'in_progress', 25, 'Lokalise에 번역 키를 생성하고 있습니다...')
          
          const tagArray = tags ? tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : []
          
          sendProgress('creation', 'in_progress', 50, '번역 데이터를 준비하고 있습니다...')
          
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
            sendProgress('creation', 'error', 0, '키 생성에 실패했습니다.')
            safeClose()
            return
          }

          const keyId = createdKeys[0].key_id
          sendProgress('creation', 'completed', 100, `번역 키가 성공적으로 생성되었습니다. (ID: ${keyId})`)

          // Send final completion message
          const finalData = JSON.stringify({
            step: 'complete',
            status: 'completed',
            progress: 100,
            keyId,
            translated: useAI,
            timestamp: new Date().toISOString()
          })
          safeEnqueue(`data: ${finalData}\n\n`)
          
        } catch (error) {
          console.error('Error creating key:', error)
          
          const errorData = JSON.stringify({
            step: 'error',
            status: 'error',
            progress: 0,
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          })
          safeEnqueue(`data: ${errorData}\n\n`)
        } finally {
          safeClose()
        }
      })()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}