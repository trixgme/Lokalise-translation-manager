import { NextResponse } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'

export async function GET() {
  try {
    const lokalise = createLokaliseClient()
    const languages = await lokalise.getLanguages()
    
    return NextResponse.json({ languages })
  } catch (error) {
    console.error('Error fetching languages:', error)
    return NextResponse.json(
      { message: 'Failed to fetch languages' },
      { status: 500 }
    )
  }
}