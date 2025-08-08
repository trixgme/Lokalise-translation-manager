import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai
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
  model = 'gpt-5'
}: TranslationRequest): Promise<string> {
  // GPT-5 모델인지 확인
  const isGpt5Model = model.startsWith('gpt-5')
  const prompt = `
You are a professional human translator specializing in ${targetLang}. Translate the following text from ${sourceLang} to ${targetLang}.
${context ? `Context: ${context}` : ''}

Text to translate: "${text}"

CRITICAL TRANSLATION PRINCIPLES:
1. **Think like a native speaker**: How would a native ${targetLang} speaker naturally express this idea?
2. **Prioritize meaning over words**: Convey the intended meaning, not word-for-word translation
3. **Use natural expressions**: Choose phrases that sound authentic and conversational in ${targetLang}
4. **Consider cultural context**: Adapt expressions to be culturally appropriate and relevant
5. **Avoid translation artifacts**: Never use awkward constructions that reveal machine translation

FORMATTING REQUIREMENTS:
1. **Line Break Preservation**: ONLY if the source text contains line breaks (\\n), preserve them in your translation. If the source text has NO line breaks, your translation must also have NO line breaks.
2. **Natural Flow**: When line breaks exist in source, position them at natural sentence or phrase boundaries in the target language
3. **Paragraph Structure**: Maintain the same paragraph structure and formatting as the original text
4. **No Extra Line Breaks**: Do NOT add line breaks if the source text doesn't have them

QUALITY STANDARDS:
- Sound like it was originally written in ${targetLang}, not translated
- Use idiomatic expressions and natural word order
- Choose vocabulary that native speakers actually use in daily conversation
- Maintain the original tone and register (formal, casual, technical, etc.)
- Ensure grammatical accuracy while prioritizing naturalness

EXAMPLES OF NATURAL VS MECHANICAL TRANSLATION:
✗ Mechanical: "Please click the button that is below to continue the process"
✓ Natural: "Click the button below to continue"

✗ Mechanical: "We are providing you with the best service possible"  
✓ Natural: "We're here to give you the best service possible"

Remember: Your goal is to produce text that sounds like it was originally written by a native ${targetLang} speaker for ${targetLang} speakers.
`

  // 토큰 제한 제거 - 모델의 최대 가능한 토큰 사용

  try {
    // GPT-5 모델용 파라미터 설정
    const completionParams: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in accurate formatting preservation. CRITICAL: ONLY preserve line breaks (\\n) if they exist in the source text. If the source text has no line breaks, your translation must also have no line breaks. Never add line breaks that are not in the original text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    }

    // GPT-5 모델별 파라미터 조정
    if (isGpt5Model) {
      // GPT-5는 max_completion_tokens와 temperature=1만 지원
      completionParams.max_completion_tokens = 4000
      completionParams.temperature = 1
    } else {
      // 기존 GPT-4 모델들은 기존 파라미터 사용
      completionParams.temperature = 0.3
    }

    const completion = await getOpenAIClient().chat.completions.create(completionParams)

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
  onProgress?: (step: string, progress: number, details?: string) => void
}

export async function batchTranslateWithOpenAI({
  text,
  sourceLang,
  targetLanguages,
  context,
  model = 'gpt-5',
  onProgress
}: BatchTranslationRequest): Promise<Record<string, string>> {
  // GPT-5 모델인지 확인
  const isGpt5Model = model.startsWith('gpt-5')
  const targetLangList = targetLanguages.map(lang => `${lang.code}: ${lang.name}`).join('\n')
  
  const prompt = `
You are a team of professional human translators, each specializing in their respective languages. Your task is to translate "${text}" from ${sourceLang} to the following languages:
${targetLangList}

${context ? `Context: ${context}` : ''}

CRITICAL TRANSLATION PRINCIPLES FOR EACH LANGUAGE:
1. **Think like native speakers**: How would native speakers of each language naturally express this idea?
2. **Prioritize meaning over words**: Convey the intended meaning, not word-for-word translation
3. **Use authentic expressions**: Choose phrases that sound natural and conversational in each language
4. **Consider cultural context**: Adapt expressions to be culturally appropriate for each target culture
5. **Avoid translation artifacts**: Never use awkward constructions that reveal machine translation
6. **Match the original tone**: Maintain the same level of formality, emotion, and style

MANDATORY LINE BREAK PRESERVATION RULES:
1. **CONDITIONAL PRESERVATION**: ONLY preserve line breaks (\\n) if they exist in the source text. If source has NO line breaks, translations must also have NO line breaks.
2. **Natural Positioning**: When line breaks exist in source, position them at natural sentence or phrase boundaries in each target language
3. **Paragraph Structure**: Maintain identical paragraph structure and formatting as the original text
4. **No Extra Line Breaks**: Never add line breaks that don't exist in the source text
5. **Exact Count Matching**: All translations must have the exact same number of line breaks as the source text (including zero)

QUALITY STANDARDS FOR EACH TRANSLATION:
- Sound like it was originally written in the target language, not translated
- Use idiomatic expressions and natural word order specific to each language
- Choose vocabulary that native speakers actually use in daily conversation
- Ensure grammatical accuracy while prioritizing naturalness
- Adapt cultural references and expressions appropriately

EXAMPLES OF NATURAL VS MECHANICAL TRANSLATION:
✗ Mechanical Korean: "버튼을 클릭해주시기 바랍니다"
✓ Natural Korean: "버튼을 눌러주세요"

✗ Mechanical Japanese: "下のボタンをクリックしてください続行するために"
✓ Natural Japanese: "下のボタンをクリックして続行してください"

RESPONSE FORMAT:
- Return ONLY a valid JSON object, nothing else
- Use the exact language codes provided above
- Do NOT wrap in markdown code blocks or add explanations
- Each translation should sound like it was originally written by a native speaker

Remember: Your goal is to produce translations that native speakers would naturally write, not mechanical translations that sound foreign.
`

  // Progress tracking with detailed steps
  onProgress?.('Preparing target languages', 5, `Planning translation for ${targetLanguages.length} languages: ${targetLanguages.map(l => l.name).join(', ')}`)
  
  console.log('=== OpenAI Batch Translation Request ===')
  console.log('Source text:', text)
  console.log('Source language:', sourceLang)
  console.log('Target languages:', targetLanguages.map(l => `${l.code} (${l.name})`).join(', '))
  console.log('Context:', context || 'None')
  console.log('Model:', model)

  onProgress?.('Analyzing source text', 10, `Source text length: ${text.length} characters`)
  
  onProgress?.('Preparing translation prompt', 15, `Building comprehensive translation prompt with ${targetLanguages.length} target languages`)
  
  onProgress?.('Optimizing for model', 20, `Configuring parameters for ${model} (${isGpt5Model ? 'GPT-5 mode' : 'GPT-4 mode'})`)
  
  // 토큰 제한 제거 - 모델의 최대 가능한 토큰 사용
  console.log('Using maximum available tokens for model:', model)
  
  onProgress?.('Creating batch translation request', 25, `Finalizing request structure for ${model}`)

  try {
    onProgress?.('Connecting to OpenAI API', 30, 'Establishing secure connection to OpenAI servers...')
    
    onProgress?.('Authenticating request', 35, 'Verifying API credentials and permissions...')
    
    onProgress?.('Sending translation request', 40, `Transmitting ${text.length} character text to ${model}...`)
    
    // GPT-5 모델용 파라미터 설정
    const completionParams: any = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in accurate formatting preservation. You MUST respond with ONLY a valid JSON object without any markdown formatting, code blocks, or additional text. Your response should start with { and end with }. CRITICAL: ONLY preserve line breaks (\\n) if they exist in the source text. If source has no line breaks, translations must also have no line breaks. Never add extra line breaks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    }

    // GPT-5 모델별 파라미터 조정
    if (isGpt5Model) {
      // GPT-5는 max_completion_tokens와 temperature=1만 지원
      completionParams.max_completion_tokens = 8000
      completionParams.temperature = 1
    } else {
      // 기존 GPT-4 모델들은 기존 파라미터 사용
      completionParams.temperature = 0.3
    }
    
    // 실제 API 호출 전 최종 확인
    onProgress?.('Executing translation', 45, `${model} is analyzing and translating your text...`)
    
    // API 호출 시작 시간 기록
    const startTime = Date.now()
    
    // API 호출 중 진행 상황 업데이트를 위한 인터벌
    let progressInterval: NodeJS.Timeout | null = null
    let elapsedSeconds = 0
    
    // 진행 상황을 주기적으로 업데이트
    progressInterval = setInterval(() => {
      elapsedSeconds += 1
      const progressPercentage = Math.min(45 + (elapsedSeconds * 1), 54) // 45%에서 54%까지 천천히 증가
      onProgress?.('Executing translation', progressPercentage, `${model} is processing your text... (${elapsedSeconds}s elapsed)`)
    }, 1000)
    
    try {
      const completion = await getOpenAIClient().chat.completions.create(completionParams)
      
      // API 호출 완료 후 인터벌 정리
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
    
    const endTime = Date.now()
    const totalTime = ((endTime - startTime) / 1000).toFixed(1)
    
    onProgress?.('Processing AI response', 55, `AI translation completed in ${totalTime}s! Processing response data...`)
    
    const response = completion.choices[0]?.message?.content?.trim()
    
    onProgress?.('Validating translation results', 60, 'Validating translation quality and format...')
    
    onProgress?.('Parsing response data', 65, 'Converting AI response to structured format...')
    
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
    
    onProgress?.('Cleaning response format', 70, 'Removing markdown formatting from AI response...')
    
    onProgress?.('Parsing JSON data', 75, 'Converting response to structured translation data...')

    // JSON 파싱 시도
    let translations: Record<string, string>
    try {
      onProgress?.('Validating JSON structure', 80, 'Verifying translation data integrity...')
      
      translations = JSON.parse(cleanResponse)
      console.log('=== Parsed Translations ===')
      Object.entries(translations).forEach(([code, translation]) => {
        console.log(`${code}: ${translation}`)
      })
      
      onProgress?.('Finalizing translations', 90, `Successfully processed ${Object.keys(translations).length} language translations`)
      
      onProgress?.('Quality verification', 95, `Verifying translation quality for ${Object.keys(translations).length} languages...`)
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

    onProgress?.('Processing translation data', 100, 'All translations completed successfully!')
    return translations
    
    } catch (error) {
      // API 호출 에러 발생 시 인터벌 정리
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      throw error
    }
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
    'pt_BR': 'Brazilian Portuguese',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'uz': 'Uzbek',
    'uz_Cyrl': 'Uzbek (Cyrillic)',
    'uz_Latn': 'Uzbek (Latin)',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'pl': 'Polish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'cs': 'Czech',
    'sk': 'Slovak',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'el': 'Greek',
    'he': 'Hebrew',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'bn': 'Bengali',
    'ta': 'Tamil',
    'te': 'Telugu',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'ne': 'Nepali',
    'si': 'Sinhala',
    'my': 'Burmese',
    'km': 'Khmer',
    'lo': 'Lao',
    'ka': 'Georgian',
    'am': 'Amharic',
    'sw': 'Swahili',
    'zu': 'Zulu',
    'xh': 'Xhosa',
    'af': 'Afrikaans',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'sl': 'Slovenian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'mk': 'Macedonian',
    'sq': 'Albanian',
    'mt': 'Maltese',
    'ga': 'Irish',
    'cy': 'Welsh',
    'eu': 'Basque',
    'ca': 'Catalan',
    'gl': 'Galician',
    'is': 'Icelandic',
    'lb': 'Luxembourgish',
    'fa': 'Persian',
    'ps': 'Pashto',
    'ur': 'Urdu',
    'az': 'Azerbaijani',
    'kk': 'Kazakh',
    'ky': 'Kyrgyz',
    'tt': 'Tatar',
    'tk': 'Turkmen',
    'mn': 'Mongolian',
    'hy': 'Armenian',
    'be': 'Belarusian',
    'bs': 'Bosnian',
    'eo': 'Esperanto',
    'jv': 'Javanese',
    'mg': 'Malagasy',
    'mi': 'Maori',
    'so': 'Somali',
    'su': 'Sundanese',
    'tg': 'Tajik',
    'yo': 'Yoruba',
    'zu_ZA': 'Zulu (South Africa)',
    'fil': 'Filipino',
    'haw': 'Hawaiian'
  }

  return languageMap[lokaliseCode] || lokaliseCode
}