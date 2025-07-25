import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 로그인 페이지는 접근 허용
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // API 라우트 중 인증 관련은 접근 허용
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // 정적 파일들은 접근 허용
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // 인증 쿠키 확인
  const auth = request.cookies.get('auth')?.value
  
  if (auth !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}