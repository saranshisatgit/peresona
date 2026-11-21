/**
 * Clean up the Nov 20–21 2026 subscriber flood in Sanity:
 *   1. Marks every `website` signup created since --since as `blocked`
 *      (reversible in Sanity Studio).
 *   2. Backfills the `mailboxKey` field on every subscriber so Gmail
 *      dot-variant abuse is detected even for pre-existing documents.
 *
 * Usage:
 *   node scripts/cleanup-spam-subscribers.mjs               # dry run
 *   node scripts/cleanup-spam-subscribers.mjs --apply       # commit changes
 *   node scripts/cleanup-spam-subscribers.mjs --apply --since=2026-11-20T00:00:00Z
 */

import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const sinceArg = args.find((a) => a.startsWith('--since='))
const SINCE = sinceArg ? sinceArg.split('=')[1] : '2026-11-20T00:00:00Z'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
// Prefer the local writer key when present; SANITY_API_TOKEN may be read-only.
const token =
  process.env.SANITY_LOCAL_WRITER_KEY || process.env.SANITY_API_TOKEN

if (!token) {
  console.error('Missing SANITY_API_TOKEN in .env.local')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-01-01',
  useCdn: false,
})

/** Same normalization as src/lib/subscribe-guard.ts getMailboxKey(). */
function getMailboxKey(email) {
  const at = email.lastIndexOf('@')
  const domain = email.slice(at + 1)
  const local = email.slice(0, at).split('+')[0]
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@gmail.com`
  }
  return `${local}@${domain}`
}

async function main() {
  const subscribers = await client.fetch(
    `*[_type == "subscriber"]{ _id, email, status, source, mailboxKey, _createdAt }`,
  )
  console.log(`Total subscribers: ${subscribers.length}`)

  // 1. The flood: website signups since --since.
  const flood = subscribers.filter(
    (s) =>
      s.source === 'website' &&
      s._createdAt >= SINCE &&
      s.status !== 'blocked',
  )
  console.log(
    `\nWebsite signups since ${SINCE} to block: ${flood.length}`,
  )
  for (const s of flood) {
    console.log(`  [block]   ${s.email}  (${s._createdAt})`)
  }

  // 2. Backfill mailboxKey everywhere it is missing.
  const missingKey = subscribers.filter((s) => !s.mailboxKey && s.email)
  console.log(`\nSubscribers missing mailboxKey: ${missingKey.length}`)

  // Sanity check: show which existing docs collide on one mailbox —
  // those are guaranteed dot-variant abuse.
  const keys = new Map()
  for (const s of subscribers) {
    const key = getMailboxKey(s.email)
    if (!keys.has(key)) keys.set(key, [])
    keys.get(key).push(s.email)
  }
  const collisions = [...keys.entries()].filter(([, list]) => list.length > 1)
  console.log(
    `\nMailboxes with multiple address variants (certain abuse): ${collisions.length}`,
  )
  for (const [key, list] of collisions) {
    console.log(`  ${key}  <=  ${list.join(', ')}`)
  }

  if (!apply) {
    console.log(
      '\nDry run — no changes written. Re-run with --apply to commit.',
    )
    return
  }

  for (const s of flood) {
    await client.patch(s._id).set({ status: 'blocked' }).commit()
  }
  console.log(`\nBlocked ${flood.length} flood subscribers.`)

  let backfilled = 0
  for (const s of missingKey) {
    await client
      .patch(s._id)
      .set({ mailboxKey: getMailboxKey(s.email) })
      .commit()
    backfilled++
  }
  console.log(`Backfilled mailboxKey on ${backfilled} subscribers.`)
}

main().catch((err) => {
  console.error('Cleanup failed:', err.message)
  process.exit(1)
})
