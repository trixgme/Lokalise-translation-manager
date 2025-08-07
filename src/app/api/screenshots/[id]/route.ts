import { NextRequest, NextResponse } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'

// 특정 스크린샷 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screenshotId = parseInt(params.id)
    
    if (isNaN(screenshotId)) {
      return NextResponse.json(
        { error: 'Invalid screenshot ID' },
        { status: 400 }
      )
    }
    
    const client = createLokaliseClient()
    const screenshot = await client.getScreenshot(screenshotId)
    
    return NextResponse.json({ screenshot })
  } catch (error: any) {
    console.error('Failed to fetch screenshot:', error)
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch screenshot' },
      { status: 500 }
    )
  }
}

// 스크린샷 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screenshotId = parseInt(params.id)
    
    if (isNaN(screenshotId)) {
      return NextResponse.json(
        { error: 'Invalid screenshot ID' },
        { status: 400 }
      )
    }
    
    const client = createLokaliseClient()
    const result = await client.deleteScreenshot(screenshotId)
    
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Failed to delete screenshot:', error)
    
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete screenshot' },
      { status: 500 }
    )
  }
}