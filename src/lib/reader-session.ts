import crypto from 'crypto'
import { cookies } from 'next/headers'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const SUBSCRIBERS_COLLECTION_ID = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID

const SECRET =
  process.env.READER_COOKIE_SECRET ||
  process.env.APPWRITE_API_KEY ||
  'dev-only-fallback-secret-change-me'

export const READER_COOKIE = 'ss_reader'
export const READER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export type ArticleAccess = 'free' | 'subscribers'

export function isSubscriberOnly(access: string | undefined | null): boolean {
  return access === 'subscribers'
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex')
}

export function signReaderToken(email: string): string {
  return `${email}.${hmac(email)}`
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
  if (!SUBSCRIBERS_COLLECTION_ID || !email) return false
  const target = email.trim().toLowerCase()
  try {
    const res = await fetch(
      `${ENDPOINT}/databases/${DATABASE_ID}/collections/${SUBSCRIBERS_COLLECTION_ID}/documents`,
      { headers: { 'X-Appwrite-Project': PROJECT_ID!, 'X-Appwrite-Key': API_KEY! } },
    )
    if (!res.ok) return false
    const data = await res.json()
    return (data.documents || []).some(
      (d: any) =>
        String(d.email).trim().toLowerCase() === target &&
        d.status === 'active',
    )
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
  return (await isSubscriber(email)) ? email : null
}

export const readerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: READER_COOKIE_MAX_AGE,
}
