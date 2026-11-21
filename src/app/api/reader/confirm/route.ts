import { NextResponse } from 'next/server'

import {
  verifyMagicToken,
  signReaderToken,
  READER_COOKIE,
  readerCookieOptions,
} from '@/lib/reader-session'
import { upsertSubscriber } from '@/lib/subscribers'

function sanitizeRedirect(path: unknown): string {
  if (typeof path !== 'string') return '/'
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const redirectTo = sanitizeRedirect(url.searchParams.get('redirect'))
  const email = verifyMagicToken(token)

  if (!email) {
    return new NextResponse(
      `<!doctype html>
<html><head><meta charset="utf-8"><title>Link expired</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="background:#fff;border-radius:12px;padding:32px 40px;max-width:420px;text-align:center;">
    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 8px;">This link has expired</h1>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 20px;">
      Confirmation links only stay valid for 30 minutes to keep your inbox
      safe. Head back to the article and enter your email again — we'll send
      you a fresh one.
    </p>
    <a href="${redirectTo}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;">Back to the article</a>
  </div>
</body></html>`,
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  const { active } = await upsertSubscriber(email)
  if (!active) {
    // Blocked (spam) subscriber — treat their link as expired.
    return new NextResponse(
      `<!doctype html>
<html><head><meta charset="utf-8"><title>Link expired</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="background:#fff;border-radius:12px;padding:32px 40px;max-width:420px;text-align:center;">
    <h1 style="font-size:20px;color:#1a1a1a;margin:0 0 8px;">This link has expired</h1>
    <p style="font-size:14px;color:#4a4a4a;line-height:1.6;margin:0 0 20px;">
      Confirmation links only stay valid for 30 minutes to keep your inbox
      safe. Head back to the article and enter your email again — we'll send
      you a fresh one.
    </p>
    <a href="${redirectTo}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 24px;border-radius:8px;">Back to the article</a>
  </div>
</body></html>`,
      { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } },
    )
  }

  const response = NextResponse.redirect(
    new URL(redirectTo, request.url),
    { status: 303 },
  )
  response.cookies.set(
    READER_COOKIE,
    signReaderToken(email),
    readerCookieOptions,
  )
  return response
}
