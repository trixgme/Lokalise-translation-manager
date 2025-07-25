import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// API 키 존재 여부 확인
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables')
}

export interface TranslationRequest {
  text: string
  sourceLang: string
  targetLang: string
  context?: string
  model?: string
}

export async function translateWithOpenAI({
  text,
  sourceLang,
  targetLang,
  context,
  model = 'gpt-4o-mini'
}: TranslationRequest): Promise<string> {
  const prompt = `
Translate the following text from ${sourceLang} to ${targetLang}.
${context ? `Context: ${context}` : ''}

Text to translate: "${text}"

IMPORTANT FORMATTING RULES:
1. If the original text contains line breaks (\\n), preserve them in your translation where they make sense for the target language
2. Maintain the same paragraph structure and formatting as the original
3. Ensure line breaks appear at natural sentence or phrase boundaries in the target language
4. Only provide the translation without any additional explanation
5. Make sure the translation is natural and appropriate for the target language and culture

Example:
Original: "Hello\\nWorld\\nWelcome"
Translation should maintain line breaks: "안녕하세요\\n세계\\n환영합니다"
`

  // 모델별 최적 토큰 수 설정
  const getMaxTokens = (model: string) => {
    if (model.includes('gpt-4')) return 4000
    if (model.includes('gpt-3.5')) return 2000
    return 2000
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Provide accurate, natural translations that are culturally appropriate. Always preserve formatting including line breaks (\\n) from the original text where they make sense in the target language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: getMaxTokens(model),
      temperature: 0.3,
    })

    return completion.choices[0]?.message?.content?.trim() || text
  } catch (error) {
    console.error('OpenAI translation error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export interface BatchTranslationRequest {
  text: string
  sourceLang: string
  targetLanguages: { code: string; name: string }[]
  context?: string
  model?: string
}

export async function batchTranslateWithOpenAI({
  text,
  sourceLang,
  targetLanguages,
  context,
  model = 'gpt-4o-mini'
}: BatchTranslationRequest): Promise<Record<string, string>> {
  const targetLangList = targetLanguages.map(lang => `${lang.code}: ${lang.name}`).join('\n')
  
  const prompt = `
IMPORTANT: You must respond with ONLY a valid JSON object. Do NOT use markdown code blocks or any formatting.

Task: Translate "${text}" from ${sourceLang} to the following languages:
${targetLangList}

${context ? `Context: ${context}` : ''}

FORMATTING RULES FOR LINE BREAKS:
- If the original text contains line breaks (\\n), preserve them in translations where appropriate
- Maintain the same paragraph structure and formatting as the original
- Ensure line breaks appear at natural sentence or phrase boundaries in each target language
- Some languages may need different line break positions for natural flow

Required output format (example):
{"ko": "안녕하세요\\n세계", "ja": "こんにちは\\n世界", "es": "Hola\\nMundo"}

Rules:
1. Return ONLY the JSON object, nothing else
2. Use the exact language codes provided above
3. Do NOT wrap in markdown code blocks
4. Do NOT add explanations or comments
5. Preserve line breaks (\\n) from original text where they make sense
6. Ensure all translations are natural and culturally appropriate
`

  console.log('=== OpenAI Batch Translation Request ===')
  console.log('Source text:', text)
  console.log('Source language:', sourceLang)
  console.log('Target languages:', targetLanguages.map(l => `${l.code} (${l.name})`).join(', '))
  console.log('Context:', context || 'None')
  console.log('Model:', model)

  // 배치 번역용 더 큰 토큰 수 설정
  const getBatchMaxTokens = (model: string) => {
    if (model.includes('gpt-4')) return 12000
    if (model.includes('gpt-3.5')) return 8000
    return 8000
  }

  const maxTokens = getBatchMaxTokens(model)
  console.log('Max tokens for batch translation:', maxTokens)

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. You MUST respond with ONLY a valid JSON object without any markdown formatting, code blocks, or additional text. Your response should start with { and end with }. Always preserve formatting including line breaks (\\n) from the original text where they make sense in each target language.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    })

    const response = completion.choices[0]?.message?.content?.trim()
    console.log('=== OpenAI Response ===')
    console.log('Raw response:', response)

    if (!response) {
      throw new Error('Empty response from OpenAI')
    }

    // 응답 정제: 마크다운 코드 블록 제거
    let cleanResponse = response
    
    // ```json으로 시작하고 ```로 끝나는 경우 제거
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    }
    // ```로 시작하고 끝나는 경우 제거
    else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // 앞뒤 공백 제거
    cleanResponse = cleanResponse.trim()
    
    console.log('=== Cleaned Response ===')
    console.log('Cleaned response:', cleanResponse)

    // JSON 파싱 시도
    let translations: Record<string, string>
    try {
      translations = JSON.parse(cleanResponse)
      console.log('=== Parsed Translations ===')
      Object.entries(translations).forEach(([code, translation]) => {
        console.log(`${code}: ${translation}`)
      })
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      console.error('Cleaned response was:', cleanResponse)
      
      // JSON이 잘린 경우 복구 시도
      try {
        // 마지막 완전한 키-값 쌍까지만 파싱
        const lastCompleteEntry = cleanResponse.lastIndexOf('",')
        if (lastCompleteEntry > 0) {
          const truncatedJson = cleanResponse.substring(0, lastCompleteEntry + 1) + '\n}'
          console.log('Attempting to parse truncated JSON:', truncatedJson)
          translations = JSON.parse(truncatedJson)
          console.log('Successfully parsed truncated JSON')
        } else {
          throw parseError
        }
      } catch (recoveryError) {
        console.error('Failed to recover truncated JSON:', recoveryError)
        // 개별 번역으로 폴백
        console.log('Falling back to individual translations...')
        throw new Error('JSON parsing failed, will use individual translation fallback')
      }
    }

    return translations
  } catch (error) {
    console.error('OpenAI batch translation error:', error)
    if (error instanceof Error) {
      console.error('Batch translation error message:', error.message)
      console.error('Batch translation error stack:', error.stack)
    }
    throw new Error(`Batch translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function getLanguageCode(lokaliseCode: string): string {
  // Lokalise에서 사용하는 언어 코드를 OpenAI가 이해할 수 있는 언어명으로 변환
  const languageMap: Record<string, string> = {
    'en': 'English',
    'ko': 'Korean',
    'ja': 'Japanese',
    'zh_CN': 'Simplified Chinese',
    'zh_TW': 'Traditional Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
  }

  return languageMap[lokaliseCode] || lokaliseCode
}