import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(`a_session_${projectId}`)

  if (pathname === '/admin/login') {
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/account`, {
    headers: {
      'X-Appwrite-Project': projectId!,
      'Content-Type': 'application/json',
      Cookie: `a_session_${projectId}=${sessionCookie.value}`,
    },
  })

  if (!res.ok) {
    const response = NextResponse.redirect(new URL('/admin/login', request.url))
    response.cookies.delete(`a_session_${projectId}`)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*',
}
