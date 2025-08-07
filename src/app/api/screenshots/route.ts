import { NextRequest, NextResponse } from 'next/server'
import { createLokaliseClient } from '@/lib/lokalise'

// 스크린샷 목록 조회
export async function GET() {
  try {
    const client = createLokaliseClient()
    const screenshots = await client.getScreenshots()
    
    return NextResponse.json({ screenshots })
  } catch (error: any) {
    console.error('Failed to fetch screenshots:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshots' },
      { status: 500 }
    )
  }
}

// 스크린샷 생성
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const client = createLokaliseClient()
    
    const screenshots = []
    let index = 0
    
    // FormData에서 스크린샷 데이터 추출
    while (formData.get(`screenshots[${index}][data]`)) {
      const data = formData.get(`screenshots[${index}][data]`)
      const title = formData.get(`screenshots[${index}][title]`) as string
      const description = formData.get(`screenshots[${index}][description]`) as string
      const keyIds = formData.getAll(`screenshots[${index}][key_ids][]`).map(id => parseInt(id as string))
      
      // Convert File to base64 if needed (should not happen in new flow)
      let dataString: string
      if (data instanceof File) {
        // This shouldn't happen in the new flow, but handle it for compatibility
        console.warn('Received File object, converting to base64...')
        // In a real scenario, we'd need to use FileReader here, but this endpoint
        // is now deprecated in favor of JSON-based uploads
        throw new Error('File upload not supported in this endpoint. Use JSON-based upload.')
      } else {
        dataString = data as string
      }
      
      screenshots.push({
        data: dataString,
        title: title || undefined,
        description: description || undefined,
        key_ids: keyIds.length > 0 ? keyIds : undefined
      })
      
      index++
    }
    
    if (screenshots.length === 0) {
      return NextResponse.json(
        { error: 'No screenshots provided' },
        { status: 400 }
      )
    }
    
    const result = await client.createScreenshots({ screenshots })
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Failed to create screenshots:', error)
    return NextResponse.json(
      { error: 'Failed to create screenshots' },
      { status: 500 }
    )
  }
}