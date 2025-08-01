import { NextRequest, NextResponse } from 'next/server'
import { translateWithOpenAI, getLanguageCode } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { text, sourceLang = 'English' } = await request.json()

    if (!text || !text.trim()) {
      return NextResponse.json(
        { message: 'Source text is required' },
        { status: 400 }
      )
    }

    // GPT-4.1을 사용해서 소스 텍스트 품질을 평가
    const prompt = `
You are a UX writing specialist for fintech mobile applications, specifically money transfer and payment apps. Your expertise is creating natural, user-friendly copy that sounds conversational and trustworthy - never robotic or machine-translated.

Context: This text will be used in a money transfer/payment mobile app and will be translated into multiple languages. The tone should be:
- Natural yet appropriately professional for financial services
- Clear and reassuring for money transactions
- Friendly but maintains necessary formality for trust
- Appropriate for mobile app UI/UX
- Free from translation artifacts or awkward phrasing

Text to evaluate: "${text}"

Evaluate this text specifically for:
1. **Natural Flow**: Does it sound like something a native speaker would naturally say?
2. **Professional Balance**: Is it appropriately professional yet approachable for financial services?
3. **User Trust**: Does it inspire confidence while remaining friendly?
4. **Translation Readiness**: Will this translate well into other languages without sounding mechanical?
5. **Mobile UI Clarity**: Is it clear and appropriately concise for mobile interfaces?

Common issues to avoid in fintech app copy:
- Overly stiff banking language ("Please proceed to initiate the transaction")
- Robotic phrasing ("Your request has been processed successfully") 
- Unnecessary complexity ("In order to facilitate the transfer of funds")
- Too casual for financial context ("Hey! Money's on its way!")
- Generic tech speak that doesn't fit financial services

Good fintech app copy examples (natural + appropriately professional):
- Instead of "Transaction initiated successfully" → "Transfer completed"
- Instead of "Please verify your identity to proceed" → "Please confirm your identity"
- Instead of "Your balance is insufficient" → "Insufficient funds available"
- Instead of "Please input the recipient details" → "Enter recipient details"
- Instead of "Money sent!" → "Transfer sent successfully"

IMPORTANT PUNCTUATION GUIDELINES:
- Use only basic punctuation: periods (.), commas (,), question marks (?), exclamation points (!)
- AVOID special characters like: em dashes (—), en dashes (–), curly quotes (" "), apostrophes ('), ellipses (…), semicolons (;), colons (:)
- Keep punctuation simple and clean for better translation compatibility
- Use straight quotes (") and straight apostrophes (') only
- This ensures clean translation across all languages and platforms

Respond with ONLY a valid JSON object in this format:
{
  "has_issues": boolean,
  "issues": ["specific problems - explain why it sounds unnatural or robotic"],
  "suggestions": ["specific improvements for natural yet professional fintech app copy"],
  "alternative_versions": [
    {
      "text": "Version 1 - slightly more formal",
      "tone": "formal"
    },
    {
      "text": "Version 2 - balanced natural and professional", 
      "tone": "balanced"
    },
    {
      "text": "Version 3 - more conversational but still professional",
      "tone": "conversational"
    }
  ]
}

IMPORTANT: Always provide 2-3 alternative versions even if the original text is good, so users can compare different natural approaches.

If the text is already natural and app-appropriate, respond with:
{
  "has_issues": false,
  "alternative_versions": [
    {
      "text": "Version 1 with slight formal adjustment",
      "tone": "formal"
    },
    {
      "text": "Version 2 - alternative natural phrasing",
      "tone": "balanced"
    }
  ]
}
`

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: `You are a UX writing specialist for fintech mobile apps. Your expertise is identifying robotic, machine-translated, or overly formal language and transforming it into natural, conversational copy that users trust. 

CRITICAL PUNCTUATION RULE: In all suggested text alternatives, use ONLY basic punctuation: periods (.), commas (,), question marks (?), exclamation points (!). NEVER use em dashes (—), en dashes (–), curly quotes, ellipses (…), semicolons (;), or colons (:). Use straight quotes and apostrophes only.

You MUST respond with ONLY a valid JSON object without any markdown formatting, code blocks, or additional text. Your response should start with { and end with }.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    })

    if (!completion.ok) {
      throw new Error(`OpenAI API error: ${completion.status}`)
    }

    const result = await completion.json()
    const response = result.choices[0]?.message?.content?.trim()

    if (!response) {
      throw new Error('Empty response from OpenAI')
    }

    // Clean response (remove any markdown code blocks)
    let cleanResponse = response
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    cleanResponse = cleanResponse.trim()

    try {
      const feedback = JSON.parse(cleanResponse)
      
      return NextResponse.json({
        success: true,
        feedback
      })
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      console.error('Clean response was:', cleanResponse)
      
      // Fallback response
      return NextResponse.json({
        success: true,
        feedback: {
          has_issues: false
        }
      })
    }

  } catch (error) {
    console.error('Error validating source text:', error)
    return NextResponse.json(
      { 
        message: 'Source text validation failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}