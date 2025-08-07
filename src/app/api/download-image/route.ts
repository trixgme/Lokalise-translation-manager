import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    console.log('=== Image Download Request ===')
    console.log('Image URL:', imageUrl)

    // URL 유효성 검사
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // HTTP/HTTPS만 허용
    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json(
        { error: 'Only HTTP and HTTPS URLs are allowed' },
        { status: 400 }
      )
    }

    // 이미지 다운로드
    console.log('Downloading image from:', imageUrl)
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Lokalise-Translation-Manager/1.0',
        'Accept': 'image/*',
      },
      // 타임아웃 설정 (30초)
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      console.error('Failed to download image:', response.status, response.statusText)
      return NextResponse.json(
        { error: `Failed to download image: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    // Content-Type 확인
    const contentType = response.headers.get('content-type') || ''
    console.log('Content-Type:', contentType)

    if (!contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL does not point to an image' },
        { status: 400 }
      )
    }

    // Content-Length 확인 (10MB 제한)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image is too large (max 10MB)' },
        { status: 413 }
      )
    }

    // 이미지 데이터 가져오기
    const arrayBuffer = await response.arrayBuffer()
    
    // 크기 재확인
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image is too large (max 10MB)' },
        { status: 413 }
      )
    }

    console.log(`Successfully downloaded image: ${arrayBuffer.byteLength} bytes`)

    // 이미지를 클라이언트에 반환
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': arrayBuffer.byteLength.toString(),
      }
    })

  } catch (error: any) {
    console.error('Error downloading image:', error)
    
    if (error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Download timeout (max 30 seconds)' },
        { status: 408 }
      )
    }
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error: Unable to reach the image URL' },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to download image' },
      { status: 500 }
    )
  }
}