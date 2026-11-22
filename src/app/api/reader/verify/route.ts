import { NextResponse } from 'next/server'

import { signMagicToken, isSubscriber } from '@/lib/reader-session'
import { sendVerificationEmail } from '@/lib/mailer'
import { upsertSubscriber } from '@/lib/subscribers'
import { verifyTurnstileToken } from '@/lib/turnstile'
import {
  validateEmail,
  isDisposableEmail,
  getMailboxKey,
  getRequestIp,
  hashIp,
  checkSendGuard,
  getSessionSendCount,
  buildSendLimitCookie,
  SESSION_LIMIT,
} from '@/lib/subscribe-guard'

function sanitizeRedirect(path: unknown): string {
  if (typeof path !== 'string') return '/'
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const redirect = sanitizeRedirect(body?.redirect)

    // Honeypot: hidden from real users, fatal for bots.
    if (typeof body?.website === 'string' && body.website.trim() !== '') {
      return NextResponse.json({
        message:
          "You're not subscribed yet, but we're making you one — check your inbox for a confirmation link.",
        pending: true,
      })
    }

    // Cloudflare Turnstile: humans only past this point.
    const human = await verifyTurnstileToken(
      body?.turnstileToken,
      getRequestIp(request),
    )
    if (!human) {
      return NextResponse.json(
        { error: 'Human verification failed. Please refresh and try again.' },
        { status: 400 },
      )
    }

    const email = validateEmail(body?.email)
    if (!email) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      )
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      )
    }

    // One session (browser) can only request a few emails per hour.
    const sessionCount = await getSessionSendCount()
    if (sessionCount >= SESSION_LIMIT) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      )
    }

    const ipHash = hashIp(getRequestIp(request))
    const guard = await checkSendGuard(email, ipHash)
    if (guard.action === 'reject') {
      return NextResponse.json(
        { error: guard.error },
        { status: guard.status },
      )
    }

    const existingSubscriber = await isSubscriber(email)

    if (guard.action === 'silent') {
      // Cooldown hit — a link is already in their inbox. Respond
      // exactly like success so the caller learns nothing.
      return NextResponse.json({
        message: existingSubscriber
          ? 'We sent a sign-in link to your inbox — click it to unlock this post.'
          : "You're not subscribed yet, but we're making you one — check your inbox for a confirmation link.",
        pending: true,
      })
    }

    try {
      await sendVerificationEmail(
        email,
        existingSubscriber ? 'signin' : 'subscribe',
        signMagicToken(email),
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

    // The email went out — persist the subscriber and the send record
    // (drives the cooldowns and global Resend budgets).
    await upsertSubscriber(email, {
      mailboxKey: getMailboxKey(email),
      ipHash,
      recordEmailSend: true,
    })

    const response = NextResponse.json(
      {
        message: existingSubscriber
          ? 'We sent a sign-in link to your inbox — click it to unlock this post.'
          : "You're not subscribed yet, but we're making you one — check your inbox for a confirmation link.",
        pending: true,
      },
      { status: 200 },
    )
    const sessionCookie = buildSendLimitCookie(sessionCount)
    if (sessionCookie) {
      response.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.options,
      )
    }
    return response
  } catch (err) {
    console.error('[reader/verify] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong on our side. Please try again shortly.' },
      { status: 500 },
    )
  }
}
