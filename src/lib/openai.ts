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
  model = 'gpt-4o'
}: TranslationRequest): Promise<string> {
  const prompt = `
Translate the following text from ${sourceLang} to ${targetLang}.
${context ? `Context: ${context}` : ''}

Text to translate: "${text}"

CRITICAL FORMATTING REQUIREMENTS:
1. **Line Break Preservation**: ONLY if the source text contains line breaks (\\n), preserve them in your translation. If the source text has NO line breaks, your translation must also have NO line breaks.
2. **Natural Flow**: When line breaks exist in source, position them at natural sentence or phrase boundaries in the target language
3. **Paragraph Structure**: Maintain the same paragraph structure and formatting as the original text
4. **No Extra Line Breaks**: Do NOT add line breaks if the source text doesn't have them

TRANSLATION QUALITY RULES:
- Use natural, conversational expressions that native speakers would actually use
- Avoid literal or robotic translations
- Ensure fluency appropriate for everyday communication
- Maintain cultural appropriateness for the target language

FORMATTING EXAMPLES:
Original: "Hello\\nWorld\\nWelcome"
Korean: "안녕하세요\\n세계\\n환영합니다"
Japanese: "こんにちは\\n世界\\nようこそ"

Original: "Please click\\nthe button below\\nto continue"
Korean: "아래 버튼을\\n클릭하여\\n계속하세요"
`

  // 토큰 제한 제거 - 모델의 최대 가능한 토큰 사용

  try {
    const completion = await getOpenAIClient().chat.completions.create({
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
      ],
      // max_tokens 제거 - 모델 최대 용량 사용
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
  onProgress?: (step: string, progress: number, details?: string) => void
}

export async function batchTranslateWithOpenAI({
  text,
  sourceLang,
  targetLanguages,
  context,
  model = 'gpt-4o',
  onProgress
}: BatchTranslationRequest): Promise<Record<string, string>> {
  const targetLangList = targetLanguages.map(lang => `${lang.code}: ${lang.name}`).join('\n')
  
  const prompt = `
CRITICAL: You must respond with ONLY a valid JSON object. Do NOT use markdown code blocks or any formatting.

Task: Translate "${text}" from ${sourceLang} to the following languages:
${targetLangList}

${context ? `Context: ${context}` : ''}

MANDATORY LINE BREAK PRESERVATION RULES:
1. **CONDITIONAL PRESERVATION**: ONLY preserve line breaks (\\n) if they exist in the source text. If source has NO line breaks, translations must also have NO line breaks.
2. **Natural Positioning**: When line breaks exist in source, position them at natural sentence or phrase boundaries in each target language
3. **Paragraph Structure**: Maintain identical paragraph structure and formatting as the original text
4. **No Extra Line Breaks**: Never add line breaks that don't exist in the source text
5. **Exact Count Matching**: All translations must have the exact same number of line breaks as the source text (including zero)

TRANSLATION QUALITY REQUIREMENTS:
- Use natural, conversational expressions native speakers would use
- Ensure cultural appropriateness for each target language
- Maintain fluency appropriate for everyday communication
- Avoid literal or robotic translations

FORMATTING EXAMPLES:
Source: "Hello\\nWorld\\nWelcome"
Output: {"ko": "안녕하세요\\n세계\\n환영합니다", "ja": "こんにちは\\n世界\\nようこそ"}

Source: "Click here\\nto continue\\nyour journey"
Output: {"ko": "여기를 클릭하여\\n계속\\n여행을 진행하세요", "ja": "ここをクリックして\\n続行\\nあなたの旅"}

RESPONSE RULES:
1. Return ONLY the JSON object, nothing else
2. Use the exact language codes provided above
3. Do NOT wrap in markdown code blocks
4. Do NOT add explanations or comments
5. MUST preserve all line breaks (\\n) from original text
6. All translations must be natural and culturally appropriate
`

  // Progress tracking
  onProgress?.('Preparing target languages', 10, `Planning translation for ${targetLanguages.length} languages: ${targetLanguages.map(l => l.name).join(', ')}`)
  
  console.log('=== OpenAI Batch Translation Request ===')
  console.log('Source text:', text)
  console.log('Source language:', sourceLang)
  console.log('Target languages:', targetLanguages.map(l => `${l.code} (${l.name})`).join(', '))
  console.log('Context:', context || 'None')
  console.log('Model:', model)

  // 토큰 제한 제거 - 모델의 최대 가능한 토큰 사용
  console.log('Using maximum available tokens for model:', model)
  
  onProgress?.('Creating batch translation request', 20, `Using maximum model capacity: ${model}`)

  try {
    onProgress?.('Calling OpenAI API', 40, 'Sending translation request to GPT model...')
    
    const completion = await getOpenAIClient().chat.completions.create({
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
      ],
      // max_tokens 제거 - 모델 최대 용량 사용
      temperature: 0.3,
    })

    const response = completion.choices[0]?.message?.content?.trim()
    onProgress?.('Validating translation results', 70, 'Received translation results from OpenAI. Validating...')
    
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
    
    onProgress?.('Processing translation data', 85, 'Processing JSON format translation results...')

    // JSON 파싱 시도
    let translations: Record<string, string>
    try {
      translations = JSON.parse(cleanResponse)
      console.log('=== Parsed Translations ===')
      Object.entries(translations).forEach(([code, translation]) => {
        console.log(`${code}: ${translation}`)
      })
      
      onProgress?.('Processing translation data', 95, `Translation successfully completed for ${Object.keys(translations).length} languages.`)
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