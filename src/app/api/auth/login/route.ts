import { NextResponse } from 'next/server'

const users: Record<string, string> = {
  'admin': process.env.ADMIN_PASSWORD || 'admin123',
  'user': process.env.USER_PASSWORD || 'user123'
}

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json()
    
    if (users[id] && users[id] === password) {
      const response = NextResponse.json({ success: true })
      response.cookies.set('auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 86400, // 24시간
        path: '/'
      })
      return response
    }
    
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}