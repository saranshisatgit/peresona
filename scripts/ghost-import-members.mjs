import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) dotenv.config({ path: envPath })

const GHOST_ADMIN_KEY = process.argv[2] || '66bab515cc48c8000187ce67:2dcaae5ee21203bbdfd6d8b1a6c874057a6e8223c5b420eefcc5416af4c43e2f'
const GHOST_URL = process.argv[3] || 'https://saranshs-desk.ghost.io'

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const SUBS_COL = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID

// --- Ghost Admin API auth ---
// Key format: {id}:{secret}
const [kid, secret] = GHOST_ADMIN_KEY.split(':')
const [header, payload] = [
  { kid, alg: 'HS256', typ: 'JWT' },
  { iat: Math.floor(Date.now() / 1000) - 60, exp: Math.floor(Date.now() / 1000) + 300, aud: '/admin/' },
]

// Sign JWT using Node.js crypto (HMAC-SHA256)
import { createHmac } from 'crypto'
function base64url(buf) {
  return buf.toString('base64url')
}
const h = base64url(Buffer.from(JSON.stringify(header)))
const p = base64url(Buffer.from(JSON.stringify(payload)))
const sig = base64url(createHmac('sha256', Buffer.from(secret, 'hex')).update(`${h}.${p}`).digest())
const token = `${h}.${p}.${sig}`

async function ghostFetch(path) {
  const res = await fetch(`${GHOST_URL}/ghost/api/admin${path}`, {
    headers: { Authorization: `Ghost ${token}`, 'Accept-Version': 'v5.98' },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ghost ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function appwriteCreate(documentId, data) {
  const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${SUBS_COL}/documents`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': APPWRITE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId, data, permissions: ['read("any")'] }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Appwrite ${res.status}: ${json.message}`)
  return json
}

// Get existing subscriber emails
async function getExistingEmails() {
  const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${SUBS_COL}/documents`, {
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
  })
  const data = await res.json()
  return new Set((data.documents || []).map(d => d.email))
}

async function main() {
  console.log(`📡 Fetching members from ${GHOST_URL}...\n`)

  // Get all members with pagination
  let allMembers = []
  let page = 1
  while (true) {
    const data = await ghostFetch(`/members/?limit=100&page=${page}&include=newsletters`)
    const members = data.members || []
    allMembers = allMembers.concat(members)
    console.log(`  Page ${page}: ${members.length} members`)
    if (members.length < 100) break
    page++
  }

  console.log(`\n📊 Total Ghost members: ${allMembers.length}`)

  if (allMembers.length === 0) {
    console.log('No members to import.')
    return
  }

  // Get existing emails
  const existing = await getExistingEmails()
  console.log(`📋 Existing Appwrite subscribers: ${existing.size}`)

  let imported = 0, skipped = 0
  for (const m of allMembers) {
    const email = m.email?.toLowerCase().trim()
    if (!email) { skipped++; continue }
    if (existing.has(email)) { skipped++; continue }

    try {
      await appwriteCreate('unique()', {
        email,
        name: m.name || '',
        status: 'active',
        source: 'ghost-import',
      })
      console.log(`  ✓ ${email}${m.name ? ` (${m.name})` : ''}`)
      imported++
    } catch (err) {
      console.error(`  ✗ ${email}: ${err.message}`)
      skipped++
    }
  }

  console.log(`\n✅ Done! ${imported} imported, ${skipped} skipped.`)
}

main().catch(console.error)
