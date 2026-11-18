import crypto from 'crypto'
import { cookies } from 'next/headers'
import { sanityClient } from '@/sanity/lib/client'

const SECRET = process.env.READER_COOKIE_SECRET || process.env.SANITY_API_TOKEN || ''

if (process.env.NODE_ENV === 'production' && !SECRET) {
  throw new Error(
    'READER_COOKIE_SECRET (or SANITY_API_TOKEN) must be set in production — ' +
      'without it reader cookies and verification links are forgeable.',
  )
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex')
}

export const READER_COOKIE = 'ss_reader'
export const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export type ArticleAccess = 'free' | 'subscribers'

export function isSubscriberOnly(access: string | undefined | null): boolean {
  return access === 'subscribers'
}

export function signReaderToken(email: string): string {
  return `${email}.${hmac(email)}`
}

/**
 * One-time magic link token: `${expiry}.${email}.${sig}`.
 * The link is emailed to the reader, and only clicking it grants
 * the reader cookie — so nobody can sign in as someone else's email.
 */
export const MAGIC_TOKEN_TTL = 1000 * 60 * 30 // 30 minutes

export function signMagicToken(email: string, ttlMs = MAGIC_TOKEN_TTL): string {
  const expiry = Date.now() + ttlMs
  const payload = `${expiry}.${email}`
  return `${payload}.${hmac(payload)}`
}

export function verifyMagicToken(
  token: string | undefined | null,
): string | null {
  if (!token) return null
  const firstDot = token.indexOf('.')
  const secondDot = token.indexOf('.', firstDot + 1)
  if (firstDot < 1 || secondDot < 0) return null
  const expiry = Number(token.slice(0, firstDot))
  const email = token.slice(firstDot + 1, secondDot)
  const sig = token.slice(secondDot + 1)
  if (!expiry || !email || !sig || Date.now() > expiry) return null
  const expected = hmac(`${expiry}.${email}`)
  if (sig.length !== expected.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null
    }
  } catch {
    return null
  }
  return email.toLowerCase()
}

export function verifyReaderToken(
  token: string | undefined | null,
): string | null {
  if (!token) return null
  const idx = token.lastIndexOf('.')
  if (idx < 1) return null
  const email = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  if (!email || !sig) return null
  const expected = hmac(email)
  if (sig.length !== expected.length) return null
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null
    }
  } catch {
    return null
  }
  return email
}

export async function isSubscriber(email: string): Promise<boolean> {
  if (!email) return false
  const target = email.trim().toLowerCase()
  try {
    const doc = await sanityClient.fetch<any>(
      `*[_type == "subscriber" && email == $email && status == "active"][0]`,
      { email: target },
    )
    return !!doc
  } catch {
    return false
  }
}

export async function getReaderEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(READER_COOKIE)?.value
  return verifyReaderToken(token)
}

export async function getVerifiedReaderEmail(): Promise<string | null> {
  const email = await getReaderEmail()
  if (!email) return null
  try {
    const doc = await sanityClient.fetch<any>(
      `*[_type == "subscriber" && email == $email][0]{ status }`,
      { email },
    )
    // Explicitly unsubscribed readers lose access.
    if (doc) return doc.status === 'active' ? email : null
  } catch {
    // Fall through: the cookie can only be obtained by clicking a
    // verification link that was emailed to this address, so it is
    // proof of a verified inbox even without a subscriber document.
  }
  return email
}

export const readerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: READER_COOKIE_MAX_AGE,
}
