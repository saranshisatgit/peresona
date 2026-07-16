/**
 * Import blog posts from Ghost to Appwrite articles collection.
 *
 * Usage:
 *   node scripts/ghost-import.mjs
 *
 * Requires these env vars in .env.local:
 *   GHOST_API_URL=https://your-blog.ghost.io
 *   GHOST_CONTENT_API_KEY=your_content_api_key
 *
 * Get your Content API Key from Ghost Admin → Settings → Integrations → Custom Integration
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const GHOST_API_URL = process.env.GHOST_API_URL
const GHOST_CONTENT_API_KEY = process.env.GHOST_CONTENT_API_KEY

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const ARTICLES_COLLECTION_ID = process.env.APPWRITE_ARTICLES_COLLECTION_ID

if (!GHOST_API_URL || !GHOST_CONTENT_API_KEY) {
  console.error('Missing Ghost env vars. Add to .env.local:')
  console.error('  GHOST_API_URL=https://your-blog.ghost.io')
  console.error('  GHOST_CONTENT_API_KEY=your_content_api_key')
  process.exit(1)
}

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID || !ARTICLES_COLLECTION_ID) {
  console.error('Missing Appwrite env vars. Ensure .env.local is fully set up.')
  process.exit(1)
}

const headers = {
  'X-Appwrite-Project': APPWRITE_PROJECT_ID,
  'X-Appwrite-Key': APPWRITE_API_KEY,
  'Content-Type': 'application/json',
}

async function ghostFetch(path) {
  const url = `${GHOST_API_URL.replace(/\/+$/, '')}/ghost/api/content${path}&key=${GHOST_CONTENT_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ghost API error (${res.status}): ${text}`)
  }
  return res.json()
}

async function appwrite(method, path, body) {
  const url = `${APPWRITE_ENDPOINT}${path}`
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Appwrite error (${res.status}): ${data.message}`)
  return data
}

function htmlToContent(html) {
  if (!html) return ''
  return html
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}

async function main() {
  console.log('\n📥 Importing posts from Ghost...\n')

  // Fetch all posts from Ghost
  let allPosts = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const data = await ghostFetch(`/posts?page=${page}&limit=15&include=tags,authors&fields=id,title,slug,html,excerpt,published_at,updated_at,status,feature_image`)
    allPosts = allPosts.concat(data.posts)
    totalPages = data.meta?.pagination?.pages || 1
    console.log(`  Fetched page ${page}/${totalPages} (${data.posts.length} posts)`)
    page++
  }

  console.log(`\n  Total posts from Ghost: ${allPosts.length}`)

  // Get existing articles in Appwrite
  const existing = await appwrite('GET', `/databases/${DATABASE_ID}/collections/${ARTICLES_COLLECTION_ID}/documents`)
  const existingSlugs = new Set((existing.documents || []).map(d => d.slug))

  let imported = 0
  let skipped = 0

  for (const post of allPosts) {
    const slug = post.slug || slugify(post.title)

    if (existingSlugs.has(slug)) {
      // Update existing
      const existingDoc = existing.documents.find(d => d.slug === slug)
      if (existingDoc) {
        await appwrite('PATCH', `/databases/${DATABASE_ID}/collections/${ARTICLES_COLLECTION_ID}/documents/${existingDoc.$id}`, {
          data: {
            title: post.title,
            description: post.excerpt || '',
            content: htmlToContent(post.html),
            author: post.authors?.[0]?.name || 'Saransh Sharma',
            date: post.published_at?.substring(0, 10) || new Date().toISOString().substring(0, 10),
            published: post.status === 'published',
          },
          permissions: ['read("any")'],
        })
        console.log(`  ✓ Updated: ${post.title}`)
        imported++
      }
    } else {
      // Create new
      await appwrite('POST', `/databases/${DATABASE_ID}/collections/${ARTICLES_COLLECTION_ID}/documents`, {
        documentId: 'unique()',
        data: {
          slug,
          title: post.title,
          description: post.excerpt || '',
          content: htmlToContent(post.html),
          author: post.authors?.[0]?.name || 'Saransh Sharma',
          date: post.published_at?.substring(0, 10) || new Date().toISOString().substring(0, 10),
          published: post.status === 'published',
        },
        permissions: ['read("any")'],
      })
      console.log(`  ✓ Imported: ${post.title}`)
      imported++
    }
  }

  console.log(`\n✅ Done! ${imported} imported/updated, ${skipped} skipped.`)
}

main().catch(err => {
  console.error('\n❌ Import failed:', err.message)
  process.exit(1)
})
