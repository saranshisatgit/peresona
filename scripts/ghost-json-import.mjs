import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const ARTICLES_COL = process.env.APPWRITE_ARTICLES_COLLECTION_ID

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID || !ARTICLES_COL) {
  console.error('Missing Appwrite env vars. Ensure .env.local is fully set up.')
  process.exit(1)
}

const headers = {
  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
  'X-Appwrite-Key': APPWRITE_API_KEY,
  'Content-Type': 'application/json',
}

async function appwrite(method, path, body) {
  const url = `${APPWRITE_ENDPOINT}${path}`
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json()
  if (!res.ok) throw new Error(`Appwrite error (${res.status}): ${data.message}`)
  return data
}

const exportPath = process.argv[2]
if (!exportPath) {
  console.error('Usage: node scripts/ghost-json-import.mjs <path-to-ghost-export.json>')
  process.exit(1)
}

const raw = readFileSync(exportPath, 'utf-8')
const exportData = JSON.parse(raw)
const db = exportData.db[0].data

const posts = db.posts || []
const users = db.users || []
const tags = db.tags || []
const authorName = users[0]?.name || 'Saransh Sharma'
const tagMap = Object.fromEntries(tags.map(t => [t.id, t.slug]))

// Build tag lookup from posts_tags
const postTags = {}
for (const rel of (db.posts_tags || [])) {
  if (!postTags[rel.post_id]) postTags[rel.post_id] = []
  postTags[rel.post_id].push(tagMap[rel.tag_id] || rel.tag_id)
}

console.log(`\n📥 Importing ${posts.length} posts from Ghost export...\n`)

// Get existing articles
const existing = await appwrite('GET', `/databases/${DATABASE_ID}/collections/${ARTICLES_COL}/documents`)
const existingSlugs = new Set((existing.documents || []).map(d => d.slug))

let imported = 0, updated = 0, skipped = 0

for (const post of posts) {
  const slug = post.slug
  if (!slug) { skipped++; continue }

  const body = {
    slug,
    title: post.title || 'Untitled',
    description: post.custom_excerpt || post.plaintext?.substring(0, 200) || '',
    content: post.html || '',
    author: authorName,
    date: (post.published_at || post.created_at || '').substring(0, 10) || new Date().toISOString().substring(0, 10),
    published: post.status === 'published',
  }

  try {
    if (existingSlugs.has(slug)) {
      const existingDoc = existing.documents.find(d => d.slug === slug)
      if (existingDoc) {
        await appwrite('PATCH', `/databases/${DATABASE_ID}/collections/${ARTICLES_COL}/documents/${existingDoc.$id}`, {
          data: body,
          permissions: ['read("any")'],
        })
        updated++
      }
    } else {
      await appwrite('POST', `/databases/${DATABASE_ID}/collections/${ARTICLES_COL}/documents`, {
        documentId: 'unique()',
        data: body,
        permissions: ['read("any")'],
      })
      imported++
    }

    const tagStr = (postTags[post.id] || []).join(', ')
    console.log(`  ${post.status === 'published' ? '✓' : '○'} ${body.date} ${post.title}${tagStr ? ` [${tagStr}]` : ''}`)
  } catch (err) {
    console.error(`  ✗ ${post.title}: ${err.message}`)
    skipped++
  }
}

console.log(`\n✅ Done! ${imported} new, ${updated} updated, ${skipped} failed.`)
console.log(`   Author: ${authorName}`)
