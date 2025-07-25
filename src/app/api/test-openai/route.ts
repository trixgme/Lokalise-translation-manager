import { NextResponse } from 'next/server'
import { translateWithOpenAI } from '@/lib/openai'

export async function POST() {
  try {
    console.log('Testing OpenAI connection...')
    console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY)
    console.log('OpenAI API Key length:', process.env.OPENAI_API_KEY?.length)
    
    const translation = await translateWithOpenAI({
      text: 'Hello World',
      sourceLang: 'English',
      targetLang: 'Korean',
      model: 'gpt-4o-mini'
    })
    
    return NextResponse.json({ 
      success: true, 
      translation,
      message: 'OpenAI connection successful'
    })
  } catch (error) {
    console.error('OpenAI test failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'OpenAI connection failed'
    }, { status: 500 })
  }
}