import crypto from 'crypto'

/**
 * Cryptographic protection for subscriber documents.
 *
 * The production Sanity dataset is world-readable (that's what keeps
 * public content free to serve), which used to mean the whole mailing
 * list was publicly queryable in plaintext. Instead of a private
 * dataset (a paid Sanity feature), subscriber docs now store:
 *
 *   - emailHash / mailboxKeyHash: HMAC-SHA256 digests used as lookup
 *     keys. Not reversible, not enumerable — you can't find subscribers
 *     you don't already know, and knowing one reveals nothing else.
 *   - emailEnc: the address itself, sealed with AES-256-GCM. Only the
 *     server (which holds the secret) can open it.
 *   - emailMasked: a harmless display form (uf••••••@gmail.com) so
 *     Sanity Studio stays human-browsable.
 *
 * The HMAC and AES keys are derived from READER_COOKIE_SECRET, so that
 * value must be identical everywhere these docs are written or read
 * (Netlify, local scripts). Rotating it invalidates every subscriber
 * document — re-run scripts/encrypt-subscribers.mjs afterwards.
 */

const SECRET =
  process.env.READER_COOKIE_SECRET || process.env.SANITY_API_TOKEN || ''

function hmac(value: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(value)
    .digest('hex')
}

export function getEmailHash(email: string): string {
  return hmac(`subscriber-email:${email}`)
}

export function getMailboxKeyHash(mailboxKey: string): string {
  return hmac(`subscriber-mailbox:${mailboxKey}`)
}

// --- AES-256-GCM sealing of the address itself ---------------------------

const ENC_PREFIX = 'v1'
let aesKeyCache: Buffer | null = null

function getAesKey(): Buffer {
  if (!aesKeyCache) {
    aesKeyCache = crypto.scryptSync(SECRET, 'ss-subscriber-email-aes', 32)
  }
  return aesKeyCache
}

export function encryptEmail(email: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getAesKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(email, 'utf-8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    ENC_PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.')
}

export function decryptEmail(blob: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = blob.split('.')
    if (version !== ENC_PREFIX || !ivB64 || !tagB64 || !dataB64) return null
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getAesKey(),
      Buffer.from(ivB64, 'base64'),
    )
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf-8')
  } catch {
    return null
  }
}

/** uf•••••••@gmail.com — safe for public display in Sanity Studio. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const keep = local.slice(0, Math.min(2, local.length))
  return `${keep}${'•'.repeat(Math.max(1, local.length - keep.length))}@${domain}`
}
