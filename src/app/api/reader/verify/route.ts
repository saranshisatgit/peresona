import { NextResponse } from 'next/server'

import {
  signReaderToken,
  isSubscriber,
  READER_COOKIE,
  readerCookieOptions,
} from '@/lib/reader-session'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const active = await isSubscriber(normalizedEmail)

    if (!active) {
      return NextResponse.json(
        {
          error:
            "This email isn't an active subscriber. Subscribe to read this post.",
        },
        { status: 403 },
      )
    }

    const response = NextResponse.json({
      message: 'Verified',
      email: normalizedEmail,
    })
    response.cookies.set(
      READER_COOKIE,
      signReaderToken(normalizedEmail),
      readerCookieOptions,
    )
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
