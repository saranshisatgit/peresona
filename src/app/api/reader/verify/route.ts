import { NextResponse } from 'next/server'

import { signMagicToken, isSubscriber } from '@/lib/reader-session'
import { sendVerificationEmail } from '@/lib/mailer'
import { upsertSubscriber } from '@/lib/subscribers'

function sanitizeRedirect(path: unknown): string {
  if (typeof path !== 'string') return '/'
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
    const existingSubscriber = await isSubscriber(normalizedEmail)

    if (!existingSubscriber) {
      // Gentle nudge: not a subscriber yet, but we'll make them one —
      // after they confirm from their own inbox.
      await upsertSubscriber(normalizedEmail)
    }

    try {
      await sendVerificationEmail(
        normalizedEmail,
        existingSubscriber ? 'signin' : 'subscribe',
        signMagicToken(normalizedEmail),
        redirect,
      )
    } catch (err) {
      console.error('[reader/verify] Failed to send email:', err)
      return NextResponse.json(
        {
          error:
            'We could not send your email right now. Please try again in a moment.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        message: existingSubscriber
          ? 'We sent a sign-in link to your inbox — click it to unlock this post.'
          : "You're not subscribed yet, but we're making you one — check your inbox for a confirmation link.",
        pending: true,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('[reader/verify] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong on our side. Please try again shortly.' },
      { status: 500 },
    )
  }
}
