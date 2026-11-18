import { NextResponse } from 'next/server'

import { signMagicToken } from '@/lib/reader-session'
import { sendVerificationEmail } from '@/lib/mailer'
import { upsertSubscriber } from '@/lib/subscribers'

function sanitizeRedirect(path: unknown): string {
  if (typeof path !== 'string') return '/'
  // Only allow same-site relative paths to avoid open redirects.
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body?.email
    const redirect = sanitizeRedirect(body?.redirect)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    await upsertSubscriber(normalizedEmail)

    try {
      await sendVerificationEmail(
        normalizedEmail,
        'subscribe',
        signMagicToken(normalizedEmail),
        redirect,
      )
    } catch (err) {
      console.error('[subscribe] Failed to send verification email:', err)
      return NextResponse.json(
        {
          error:
            'We could not send your confirmation email right now. Please try again in a moment.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        message:
          "You're not subscribed yet, but we're making you one — we just sent a confirmation link to your inbox. One click and you're in.",
        pending: true,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('[subscribe] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong on our side. Please try again shortly.' },
      { status: 500 },
    )
  }
}
