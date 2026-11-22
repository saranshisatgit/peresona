/**
 * Encrypt-in-place migration for subscriber documents.
 *
 * The production dataset is world-readable, and subscriber docs used to
 * store emails in plaintext. This script rewrites every legacy doc into
 * the protected shape (see src/lib/subscriber-crypto.ts):
 *
 *   email, mailboxKey      →  emailHash, mailboxKeyHash (HMAC lookup keys)
 *                             emailEnc  (AES-256-GCM sealed address)
 *                             emailMasked (uf••••@gmail.com for Studio)
 *
 * Legacy docs are DELETED and recreated with new IDs so no plaintext
 * address survives in Sanity's revision history. Already-migrated docs
 * are skipped, so the script is idempotent.
 *
 * Usage:
 *   node scripts/encrypt-subscribers.mjs            # dry run
 *   node scripts/encrypt-subscribers.mjs --apply    # rewrite documents
 *
 * REQUIRES READER_COOKIE_SECRET to be set (same value as production
 * Netlify) — it derives every hash and the AES key, so a mismatched
 * secret would produce documents the live site can never look up.
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true })
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')

const SECRET = process.env.READER_COOKIE_SECRET || ''
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token =
  process.env.SANITY_LOCAL_WRITER_KEY || process.env.SANITY_API_TOKEN

if (!SECRET) {
  console.error(
    '✖ READER_COOKIE_SECRET is not set in .env.local.\n' +
      '  It must match the production (Netlify) value — every hash and the\n' +
      '  AES key are derived from it. Copy it from Netlify env vars first.',
  )
  process.exit(1)
}
if (!token) {
  console.error('Missing SANITY_LOCAL_WRITER_KEY (or SANITY_API_TOKEN)')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
})

// --- same crypto as src/lib/subscriber-crypto.ts -------------------------

function hmac(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex')
}
const getEmailHash = (email) => hmac(`subscriber-email:${email}`)
const getMailboxKeyHash = (mailboxKey) =>
  hmac(`subscriber-mailbox:${mailboxKey}`)

const aesKey = crypto.scryptSync(SECRET, 'ss-subscriber-email-aes', 32)

function encryptEmail(email) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv)
  const ciphertext = Buffer.concat([cipher.update(email, 'utf-8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.')
}

function maskEmail(email) {
  const at = email.lastIndexOf('@')
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const keep = local.slice(0, Math.min(2, local.length))
  return `${keep}${'•'.repeat(Math.max(1, local.length - keep.length))}@${domain}`
}

function getMailboxKey(email) {
  const at = email.lastIndexOf('@')
  const domain = email.slice(at + 1)
  const local = email.slice(0, at).split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@gmail.com`
  }
  return `${local}@${domain}`
}

// ---------------------------------------------------------------------------

async function main() {
  const docs = await client.fetch(
    `*[_type == "subscriber"]{ _id, email, name, status, source, mailboxKey, lastEmailSentAt, sentEmailCount, signupIpHash, _createdAt, _updatedAt }`,
  )
  const legacy = docs.filter((d) => d.email && !d._id.startsWith('drafts'))
  const done = docs.filter((d) => !d.email)
  console.log(`Total: ${docs.length} (${legacy.length} legacy, ${done.length} already sealed)`)

  if (legacy.length === 0) {
    console.log('✓ Nothing to migrate.')
    return
  }

  // Dedupe variants (Gmail dot tricks) that map to the same hash now.
  const byHash = new Map()
  for (const doc of legacy) {
    const h = getEmailHash(doc.email.toLowerCase())
    if (!byHash.has(h)) byHash.set(h, [])
    byHash.get(h).push(doc)
  }

  const winners = []
  const duplicates = []
  for (const [, group] of byHash) {
    group.sort((a, b) => {
      const rank = (d) => (d.status === 'active' ? 2 : d.status === 'inactive' ? 1 : 0)
      return rank(b) - rank(a) || Date.parse(b._updatedAt) - Date.parse(a._updatedAt)
    })
    winners.push(group[0])
    duplicates.push(...group.slice(1))
  }
  console.log(`Unique inboxes to seal: ${winners.length} (dropping ${duplicates.length} duplicate variants)`)

  for (const doc of winners) {
    console.log(`  seal ${doc.email} → ${maskEmail(doc.email)} [${doc.status}]`)
  }

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to migrate.')
    return
  }

  let sealed = 0
  for (const doc of winners) {
    const email = doc.email.toLowerCase()
    const sealedDoc = {
      _type: 'subscriber',
      emailHash: getEmailHash(email),
      emailEnc: encryptEmail(email),
      emailMasked: maskEmail(email),
      name: doc.name || '',
      status: doc.status,
      source: doc.source,
      mailboxKeyHash: getMailboxKeyHash(getMailboxKey(email)),
      ...(doc.lastEmailSentAt ? { lastEmailSentAt: doc.lastEmailSentAt } : {}),
      ...(doc.sentEmailCount ? { sentEmailCount: doc.sentEmailCount } : {}),
      ...(doc.signupIpHash ? { signupIpHash: doc.signupIpHash } : {}),
    }
    await client.create(sealedDoc)
    sealed++
  }
  console.log(`\nSealed ${sealed} new documents.`)

  const toDelete = [...winners, ...duplicates].map((d) => d._id)
  await client.delete(toDelete)
  console.log(`Deleted ${toDelete.length} legacy documents (including ${duplicates.length} duplicates).`)

  // Verify: nothing plaintext remains, counts line up.
  const after = await client.fetch(
    `*[_type == "subscriber"]{ email, emailHash, emailMasked, status }`,
  )
  const withPlaintext = after.filter((d) => !!d.email)
  const sealedCount = after.filter((d) => !!d.emailHash).length
  console.log(`\nAfter: ${after.length} docs, ${sealedCount} sealed, ${withPlaintext.length} with plaintext.`)
  if (withPlaintext.length > 0 || sealedCount !== winners.length) {
    console.error('✖ Verification failed — check manually before deploying.')
    process.exit(1)
  }
  console.log('✓ Mailing list is no longer publicly readable.')
}

main().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
