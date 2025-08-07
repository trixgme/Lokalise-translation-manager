import { NextRequest, NextResponse } from 'next/server'
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

interface KeyRecommendation {
  key: string
  reasoning: string
  category: string
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Text is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    console.log('=== Key Recommendation Request ===')
    console.log('Input text:', text)

    const prompt = `You are a senior software engineer specializing in internationalization (i18n) and translation key naming conventions. 

Your task is to recommend translation keys for the following English text: "${text}"

NAMING CONVENTION RULES:
1. Use ONLY underscores (_) to separate words (e.g., "home_welcome_title")
2. NO dot notation - use underscores for all separations
3. Use snake_case throughout (e.g., "user_profile_edit_button")
4. Be descriptive but concise
5. Consider the context and likely usage
6. Group related keys with common prefixes using underscores
7. Use consistent patterns for similar UI elements

CATEGORIES to choose from:
- UI: User interface elements (buttons, labels, headers)
- Action: Action-related text (save, delete, confirm)
- Navigation: Navigation elements (menu, breadcrumbs, tabs)
- Form: Form-related text (placeholders, validation, labels)
- Message: Messages, notifications, alerts
- General: General content that doesn't fit other categories

CONTEXT ANALYSIS:
Consider if this text might be used for:
- Buttons or interactive elements
- Page titles or headers
- Form labels or placeholders
- Error or success messages
- Navigation items
- Descriptive content

Please provide exactly 4 diverse key recommendations that follow these patterns:

RESPONSE FORMAT (JSON only, no markdown):
{
  "recommendations": [
    {
      "key": "suggested_key_name",
      "reasoning": "Brief explanation of why this key structure makes sense",
      "category": "UI|Action|Navigation|Form|Message|General"
    }
  ]
}

Focus on:
1. Different organizational approaches using underscores only
2. Various contexts where this text might be used
3. Scalability for similar keys with underscore prefixes
4. Industry best practices for fintech/banking apps
5. REMEMBER: Use only underscores (_) for all word separations

EXAMPLES OF CORRECT KEY FORMAT:
- "welcome_message" 
- "user_profile_edit_button"
- "home_welcome_title"
- "fintech_platform_welcome"

Remember: Return ONLY valid JSON, no additional text or formatting.`

    console.log('Calling OpenAI with GPT-3.5-Turbo for key recommendations...')

    const completion = await getOpenAIClient().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in internationalization (i18n) and translation key naming conventions. You must respond with only valid JSON format, no additional text or markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7, // Some creativity for diverse suggestions
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content?.trim()
    console.log('OpenAI response:', response)

    if (!response) {
      throw new Error('Empty response from OpenAI')
    }

    // Clean response - remove any markdown formatting
    let cleanResponse = response
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    cleanResponse = cleanResponse.trim()
    console.log('Cleaned response:', cleanResponse)

    // Parse JSON response
    let recommendations: KeyRecommendation[]
    try {
      const parsed = JSON.parse(cleanResponse)
      recommendations = parsed.recommendations || []
      
      // Validate recommendations structure
      if (!Array.isArray(recommendations)) {
        throw new Error('Recommendations must be an array')
      }
      
      // Validate each recommendation
      recommendations = recommendations.filter(rec => 
        rec && 
        typeof rec.key === 'string' && 
        typeof rec.reasoning === 'string' && 
        typeof rec.category === 'string' &&
        rec.key.trim() && 
        rec.reasoning.trim() && 
        rec.category.trim()
      )
      
      if (recommendations.length === 0) {
        throw new Error('No valid recommendations found')
      }
      
      console.log('✅ Successfully parsed recommendations:', recommendations.length)
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.key} (${rec.category}) - ${rec.reasoning}`)
      })
      
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      console.error('Response was:', cleanResponse)
      
      // Fallback: create basic recommendations
      console.log('Creating fallback recommendations...')
      const fallbackKey = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50)
      
      recommendations = [
        {
          key: `ui_${fallbackKey}`,
          reasoning: 'Generic UI key based on text content (fallback)',
          category: 'UI'
        },
        {
          key: `common_${fallbackKey}`,
          reasoning: 'Common text key for reusable content (fallback)',
          category: 'General'
        }
      ]
    }

    return NextResponse.json({
      success: true,
      recommendations,
      inputText: text,
      model: 'gpt-3.5-turbo'
    })

  } catch (error: any) {
    console.error('❌ Key recommendation API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate key recommendations',
        details: error.message
      },
      { status: 500 }
    )
  }
}