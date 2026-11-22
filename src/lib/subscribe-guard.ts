import crypto from 'crypto'
import { cookies } from 'next/headers'

import { sanityWriteClient } from '@/sanity/lib/client'
import { getEmailHash, getMailboxKeyHash } from '@/lib/subscriber-crypto'

/**
 * Anti-abuse guard for the two endpoints that send email
 * (/api/subscribe and /api/reader/verify).
 *
 * The site was targeted on Nov 20–21 2026 by a subscriber flood:
 * dozens of signups per hour, many of them Gmail "dot trick" variants
 * of the same mailbox (ufoyaruh527@… / u.f.o.y.ar.uh.5.2.7@…), which
 * exhausted the Resend quota. These checks make that attack (and
 * similar ones) unprofitable:
 *
 *  - mailbox normalization: dots (Gmail) and +tags are stripped, so all
 *    variants of one inbox share a `mailboxKey` — cooldowns and limits
 *    apply per inbox, not per string.
 *  - per-mailbox cooldown: at most one email per inbox per hour; extra
 *    requests get a silent "check your inbox" instead of a new email.
 *  - per-session cap: a signed cookie limits how many emails one
 *    browser session can request; beyond that we bounce with 429.
 *  - per-IP and global caps: Sanity-backed counters bound worst-case
 *    Resend usage per hour/day so the quota can never be drained again.
 *  - `blocked` subscriber status + disposable-domain blocklist.
 */

const SECRET =
  process.env.READER_COOKIE_SECRET || process.env.SANITY_API_TOKEN || ''

export const MAILBOX_COOLDOWN_MS = 60 * 60 * 1000 // 1 email / inbox / hour
export const MAILBOX_VARIANT_LIMIT = 3 // variants of one inbox before a hard bounce
export const MAILBOX_DAILY_LIMIT = 5 // emails / inbox / day
export const SESSION_LIMIT = 3 // emails / browser session / hour
export const SESSION_WINDOW_MS = 60 * 60 * 1000
export const IP_DAILY_LIMIT = 10 // signups / IP / day
export const GLOBAL_HOURLY_LIMIT = Number(process.env.EMAIL_HOURLY_LIMIT || 10)
export const GLOBAL_DAILY_LIMIT = Number(process.env.EMAIL_DAILY_LIMIT || 50)

const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'tempmail.com',
  'tempmail.net',
  'tempmail.org',
  'temp-mail.org',
  'temp-mail.io',
  'throwawaymail.com',
  'getnada.com',
  'nada.email',
  'dispostable.com',
  'maildrop.cc',
  'mailnesia.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.de',
  'mytemp.email',
  'tempmailo.com',
  'mohmal.com',
  'dropmail.me',
  'emailondeck.com',
  'fakeinbox.com',
  'spamgourmet.com',
  'mailcatch.com',
  'mintemail.com',
  'spam4.me',
  'tempinbox.com',
  'tmpmail.org',
  'tmpmail.net',
  'luxusmail.org',
  'tempr.email',
  'mail-temp.com',
])

/**
 * Strict validation: lowercases, length-caps, and rejects the dot/hostname
 * edge cases the browser's type=email and the old regex let through.
 * Returns the normalized address, or null.
 */
export function validateEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const email = raw.trim().toLowerCase()
  if (email.length < 6 || email.length > 254) return null
  if (!EMAIL_RE.test(email)) return null
  const at = email.lastIndexOf('@')
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  if (
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    local.startsWith('+') ||
    domain.includes('..') ||
    domain.startsWith('-') ||
    domain.includes('.-') ||
    domain.includes('-.')
  ) {
    return null
  }
  return email
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.slice(email.lastIndexOf('@') + 1)
  if (DISPOSABLE_DOMAINS.has(domain)) return true
  for (const blocked of DISPOSABLE_DOMAINS) {
    if (domain.endsWith('.' + blocked)) return true
  }
  return false
}

/**
 * Canonical inbox identity. Gmail ignores dots in the local part and
 * treats googlemail.com as gmail.com; most providers ignore +tags.
 * `u.f.o.y.ar.uh.5.2.7@gmail.com` and `ufoyaruh527@gmail.com` map to
 * the same key, so cooldowns and variant limits can't be dodged by
 * sprinkling dots.
 */
export function getMailboxKey(email: string): string {
  const at = email.lastIndexOf('@')
  const domain = email.slice(at + 1)
  const local = email.slice(0, at).split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@gmail.com`
  }
  return `${local}@${domain}`
}

export function getRequestIp(request: Request): string {
  const headers = request.headers
  return (
    headers.get('x-nf-client-connection-ip') || // Netlify
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

export function hashIp(ip: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`ip:${ip}`)
    .digest('hex')
    .slice(0, 24)
}

// ---------------------------------------------------------------------------
// Per-session send counter (signed cookie, stateless — survives serverless)
// ---------------------------------------------------------------------------

export const SEND_LIMIT_COOKIE = 'ss_send_limit'

function cookieSig(payload: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`send-limit:${payload}`)
    .digest('hex')
}

export async function getSessionSendCount(): Promise<number> {
  if (!SECRET) return 0
  const store = await cookies()
  const raw = store.get(SEND_LIMIT_COOKIE)?.value
  return raw ? parseSendLimitCookie(raw) : 0
}

/** Pure counterpart of buildSendLimitCookie — returns the count, or 0. */
export function parseSendLimitCookie(raw: string): number {
  if (!SECRET || !raw) return 0
  const [countStr, expiryStr, sig] = raw.split('.')
  if (!countStr || !expiryStr || !sig) return 0
  const expected = cookieSig(`${countStr}.${expiryStr}`)
  if (sig.length !== expected.length) return 0
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return 0
    }
  } catch {
    return 0
  }
  const count = Number(countStr)
  const expiry = Number(expiryStr)
  if (!Number.isInteger(count) || count < 0 || !expiry || Date.now() > expiry) {
    return 0
  }
  return count
}

export function buildSendLimitCookie(
  currentCount: number,
): { name: string; value: string; options: object } | null {
  if (!SECRET) return null
  const payload = `${currentCount + 1}.${Date.now() + SESSION_WINDOW_MS}`
  const value = `${payload}.${cookieSig(payload)}`
  return {
    name: SEND_LIMIT_COOKIE,
    value,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_WINDOW_MS / 1000,
    },
  }
}

// ---------------------------------------------------------------------------
// Sanity-backed rate limiting
// ---------------------------------------------------------------------------

export type SendGuardDecision =
  | { action: 'send' }
  | { action: 'silent' }
  | { action: 'reject'; status: 400 | 429 | 503; error: string }

const GENERIC_BOUNCE =
  'Too many requests. Please try again later.'

/**
 * Decide whether an email may be sent to this address:
 *  - 'send'   → proceed with the send
 *  - 'silent' → respond success but send nothing (cooldown hit; the
 *                user already has a link in their inbox)
 *  - 'reject' → bounce with the given status
 */
export async function checkSendGuard(
  email: string,
  ipHash: string,
): Promise<SendGuardDecision> {
  const mailboxKey = getMailboxKey(email)
  const emailHash = getEmailHash(email)
  const mailboxKeyHash = getMailboxKeyHash(mailboxKey)
  const now = Date.now()
  const params = {
    emailHash,
    mailboxKeyHash,
    ipHash,
    hourAgo: new Date(now - 60 * 60 * 1000).toISOString(),
    dayAgo: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
  }

  let data: any
  try {
    data = await sanityWriteClient.fetch(
      `{
        "matches": *[_type == "subscriber"
          && (emailHash == $emailHash || mailboxKeyHash == $mailboxKeyHash)
        ]{ status, lastEmailSentAt },
        "mailboxVariants": count(*[_type == "subscriber"
          && mailboxKeyHash == $mailboxKeyHash]),
        "mailboxDay": count(*[_type == "subscriber"
          && mailboxKeyHash == $mailboxKeyHash
          && defined(lastEmailSentAt) && lastEmailSentAt > $dayAgo]),
        "ipDay": count(*[_type == "subscriber"
          && signupIpHash == $ipHash && _createdAt > $dayAgo]),
        "globalHour": count(*[_type == "subscriber"
          && defined(lastEmailSentAt) && lastEmailSentAt > $hourAgo]),
        "globalDay": count(*[_type == "subscriber"
          && defined(lastEmailSentAt) && lastEmailSentAt > $dayAgo]),
      }`,
      params,
    )
  } catch (err) {
    console.error('[guard] Sanity rate-limit check failed:', err)
    // Fail closed: without Sanity we cannot enforce any limit, and an
    // open door here is exactly what drained the Resend quota.
    return {
      action: 'reject',
      status: 503,
      error: 'We could not process your request right now. Please try again in a moment.',
    }
  }

  const matches: any[] = data?.matches || []

  if (matches.some((m) => m.status === 'blocked')) {
    return { action: 'reject', status: 429, error: GENERIC_BOUNCE }
  }

  // One inbox masquerading as many addresses (Gmail dot trick, +tags).
  if ((data?.mailboxVariants || 0) >= MAILBOX_VARIANT_LIMIT) {
    return { action: 'reject', status: 429, error: GENERIC_BOUNCE }
  }

  // Cooldown: this inbox already received a link recently.
  const lastSent = matches
    .map((m) => Date.parse(m.lastEmailSentAt))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0]
  if (lastSent && now - lastSent < MAILBOX_COOLDOWN_MS) {
    return { action: 'silent' }
  }

  if ((data?.mailboxDay || 0) >= MAILBOX_DAILY_LIMIT) {
    return { action: 'reject', status: 429, error: GENERIC_BOUNCE }
  }
  if ((data?.ipDay || 0) >= IP_DAILY_LIMIT) {
    return { action: 'reject', status: 429, error: GENERIC_BOUNCE }
  }
  if ((data?.globalHour || 0) >= GLOBAL_HOURLY_LIMIT) {
    return {
      action: 'reject',
      status: 503,
      error: 'Our email service is a bit busy right now. Please try again in a little while.',
    }
  }
  if ((data?.globalDay || 0) >= GLOBAL_DAILY_LIMIT) {
    return {
      action: 'reject',
      status: 503,
      error: 'Our email service is a bit busy right now. Please try again in a little while.',
    }
  }

  return { action: 'send' }
}
