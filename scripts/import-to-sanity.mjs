/**
 * Import all content from Ghost JSON export + Appwrite into Sanity.
 *
 * Usage:
 *   node scripts/import-to-sanity.mjs [path-to-ghost-export.json]
 *
 * If no path is given, skips Ghost import.
 *
 * Reads from .env.local for:
 *   - Sanity:  NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN
 *   - Appwrite (source): all APPWRITE_* vars
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) dotenv.config({ path: envPath })

// --- Sanity client ---
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

// --- Appwrite config (source) ---
const AW_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
const AW_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '6a588e900023d98d8699'
const AW_API_KEY = 'standard_0556c4e5c6dd6d854e5bfdd4109904d72d3b5bb3f6d165f5c1fe32585e345dd5335e9dc086be59179da837e762773cce4655e835ec513e649e90727738a6f5d0ae6a6f8aa574a40d468a14263a71aa27b0c8c75edafd5b7f33260d889c0a16925356b602ff7b7cbc6fa17d4f2fb4980bcdcc306e433c39ae77f0642dfe86a271'
const AW_DB_ID = process.env.APPWRITE_DATABASE_ID || '6a5893ec09799c8514f0'

const AW_COL = {
  siteContent: '6a5893ecf17c478fd7bd',
  experience: '6a5893f6298bd333db9e',
  projects: '6a58940a56ac28fa5a78',
  tools: '6a58940f545141fc5e94',
  socialLinks: '6a5894144bb3acfaea49',
  subscribers: '6a5897ca57321b54942a',
  articles: '6a5893f1d45dd26dba20',
}

async function fetchDocs(colId) {
  const res = await fetch(`${AW_ENDPOINT}/databases/${AW_DB_ID}/collections/${colId}/documents`, {
    headers: { 'X-Appwrite-Project': AW_PROJECT_ID, 'X-Appwrite-Key': AW_API_KEY },
  })
  const data = await res.json()
  return data.documents || []
}

// --- Helpers ---
async function getExistingSlugs() {
  try {
    const docs = await sanity.fetch(`*[_type == "article" && defined(slug.current)]{ "slug": slug.current }`)
    return new Set(docs.map((d) => d.slug))
  } catch {
    return new Set()
  }
}

async function getExistingEmails() {
  try {
    const docs = await sanity.fetch(`*[_type == "subscriber"]{ email }`)
    return new Set(docs.map((d) => d.email))
  } catch {
    return new Set()
  }
}

async function getExistingKeys() {
  try {
    const docs = await sanity.fetch(`*[_type == "siteContent"]{ key }`)
    return new Set(docs.map((d) => d.key))
  } catch {
    return new Set()
  }
}

// --- 1. Import Ghost posts ---
async function importGhostPosts(jsonPath) {
  if (!jsonPath || !existsSync(jsonPath)) {
    console.log('⚠️  No Ghost JSON path provided, skipping Ghost import.')
    return
  }

  const raw = readFileSync(jsonPath, 'utf-8')
  const exportData = JSON.parse(raw)
  const db = exportData.db[0].data
  const posts = db.posts || []
  const users = db.users || []
  const authorName = users[0]?.name || 'Saransh Sharma'

  console.log(`\n📰 Ghost import: ${posts.length} posts found\n`)

  const existingSlugs = await getExistingSlugs()

  let created = 0, updated = 0, skipped = 0

  for (const post of posts) {
    const slug = post.slug
    if (!slug) { skipped++; continue }

    const date = (post.published_at || post.created_at || new Date().toISOString()).substring(0, 10)
    const title = post.title || 'Untitled'
    const description = post.custom_excerpt || post.plaintext?.substring(0, 200) || ''
    const content = post.html || ''
    const published = post.status === 'published'

    // Check if already exists
    if (existingSlugs.has(slug)) {
      // Update existing
      try {
        const existing = await sanity.fetch(`*[_type == "article" && slug.current == $slug][0]`, { slug })
        if (existing) {
          await sanity.patch(existing._id).set({
            title, description, content, author: authorName,
            date, published,
          }).commit()
          updated++
        }
      } catch (err) {
        console.error(`  ✗ Updated failed: ${title}: ${err.message}`)
        skipped++
      }
    } else {
      // Create new
      try {
        await sanity.create({
          _type: 'article',
          title,
          slug: { _type: 'slug', current: slug },
          description,
          content,
          author: authorName,
          date,
          published,
          access: 'free',
        })
        created++
      } catch (err) {
        console.error(`  ✗ Create failed: ${title}: ${err.message}`)
        skipped++
      }
    }

    console.log(`  ${published ? '✓' : '○'} ${date} ${title}`)
  }

  console.log(`\n  Ghost: ${created} created, ${updated} updated, ${skipped} skipped`)
}

// --- 2. Import Appwrite site content ---
async function importSiteContent() {
  console.log('\n📄 Importing site content from Appwrite...\n')
  const docs = await fetchDocs(AW_COL.siteContent)
  const existingKeys = await getExistingKeys()

  let created = 0, updated = 0

  for (const doc of docs) {
    const key = doc.key
    const value = doc.value || ''
    const isImage = key.includes('photo') || key.includes('avatar') || key.includes('portrait')

    try {
      if (existingKeys.has(key)) {
        const existing = await sanity.fetch(`*[_type == "siteContent" && key == $key][0]`, { key })
        if (existing) {
          await sanity.patch(existing._id).set({ value }).commit()
          updated++
        }
      } else {
        await sanity.create({
          _type: 'siteContent',
          key,
          value,
        })
        created++
      }
      console.log(`  ✓ ${key}`)
    } catch (err) {
      console.error(`  ✗ ${key}: ${err.message}`)
    }
  }

  console.log(`\n  Site content: ${created} created, ${updated} updated`)
}

// --- 3. Import Appwrite experience ---
async function importExperience() {
  console.log('\n💼 Importing experience from Appwrite...\n')
  const docs = await fetchDocs(AW_COL.experience)
  docs.sort((a, b) => a.sort_order - b.sort_order)

  let created = 0

  for (const doc of docs) {
    try {
      await sanity.create({
        _type: 'experience',
        company: doc.company || '',
        title: doc.title || '',
        logo: doc.logo || '',
        start: doc.start || '',
        end: doc.end || '',
        sortOrder: doc.sort_order || 0,
      })
      created++
      console.log(`  ✓ ${doc.company} | ${doc.title}`)
    } catch (err) {
      console.error(`  ✗ ${doc.company}: ${err.message}`)
    }
  }

  console.log(`\n  Experience: ${created} created`)
}

// --- 4. Import Appwrite projects ---
async function importProjects() {
  console.log('\n📦 Importing projects from Appwrite...\n')
  const docs = await fetchDocs(AW_COL.projects)
  docs.sort((a, b) => a.sort_order - b.sort_order)

  let created = 0

  for (const doc of docs) {
    try {
      await sanity.create({
        _type: 'project',
        name: doc.name || '',
        description: doc.description || '',
        url: doc.url || '',
        label: doc.label || '',
        logo: doc.logo || '',
        sortOrder: doc.sort_order || 0,
      })
      created++
      console.log(`  ✓ ${doc.name}`)
    } catch (err) {
      console.error(`  ✗ ${doc.name}: ${err.message}`)
    }
  }

  console.log(`\n  Projects: ${created} created`)
}

// --- 5. Import Appwrite tools ---
async function importTools() {
  console.log('\n🛠 Importing tools from Appwrite...\n')
  const docs = await fetchDocs(AW_COL.tools)
  docs.sort((a, b) => a.sort_order - b.sort_order)

  let created = 0

  for (const doc of docs) {
    try {
      await sanity.create({
        _type: 'tool',
        section: doc.section || '',
        title: doc.title || '',
        description: doc.description || '',
        url: doc.url || '',
        sortOrder: doc.sort_order || 0,
      })
      created++
      console.log(`  ✓ ${doc.section} | ${doc.title}`)
    } catch (err) {
      console.error(`  ✗ ${doc.title}: ${err.message}`)
    }
  }

  console.log(`\n  Tools: ${created} created`)
}

// --- 6. Import Appwrite social links ---
async function importSocialLinks() {
  console.log('\n🔗 Importing social links from Appwrite...\n')
  const docs = await fetchDocs(AW_COL.socialLinks)
  docs.sort((a, b) => a.sort_order - b.sort_order)

  let created = 0

  for (const doc of docs) {
    try {
      await sanity.create({
        _type: 'socialLink',
        platform: doc.platform || '',
        url: doc.url || '',
        label: doc.label || '',
        sortOrder: doc.sort_order || 0,
      })
      created++
      console.log(`  ✓ ${doc.platform} | ${doc.url}`)
    } catch (err) {
      console.error(`  ✗ ${doc.platform}: ${err.message}`)
    }
  }

  console.log(`\n  Social links: ${created} created`)
}

// --- 7. Import Appwrite subscribers ---
async function importSubscribers() {
  console.log('\n✉️ Importing subscribers from Appwrite...\n')
  const docs = await fetchDocs(AW_COL.subscribers)
  const existingEmails = await getExistingEmails()

  let created = 0, skipped = 0

  for (const doc of docs) {
    const email = (doc.email || '').trim().toLowerCase()
    if (!email) { skipped++; continue }

    if (existingEmails.has(email)) {
      skipped++
      continue
    }

    try {
      await sanity.create({
        _type: 'subscriber',
        email,
        name: doc.name || '',
        status: doc.status || 'active',
        source: doc.source || 'appwrite-import',
      })
      created++
      console.log(`  ✓ ${email}`)
    } catch (err) {
      console.error(`  ✗ ${email}: ${err.message}`)
      skipped++
    }
  }

  console.log(`\n  Subscribers: ${created} created, ${skipped} skipped`)
}

// --- 8. Import Appwrite articles (if not already in Ghost) ---
async function importAppwriteArticles() {
  console.log('\n📝 Importing Appwrite articles (that aren\'t in Ghost)...\n')
  const docs = await fetchDocs(AW_COL.articles)
  const existingSlugs = await getExistingSlugs()

  let created = 0, skipped = 0

  for (const doc of docs) {
    const slug = doc.slug
    if (!slug) { skipped++; continue }

    if (existingSlugs.has(slug)) {
      skipped++
      continue
    }

    try {
      await sanity.create({
        _type: 'article',
        title: doc.title || 'Untitled',
        slug: { _type: 'slug', current: slug },
        description: doc.description || '',
        content: doc.content || '',
        author: doc.author || 'Saransh Sharma',
        date: doc.date || new Date().toISOString().substring(0, 10),
        published: doc.published !== false,
        access: doc.access || 'free',
      })
      created++
      existingSlugs.add(slug)
      console.log(`  ✓ ${doc.date} ${doc.title}`)
    } catch (err) {
      console.error(`  ✗ ${doc.title}: ${err.message}`)
      skipped++
    }
  }

  console.log(`\n  Appwrite articles: ${created} created, ${skipped} skipped (already exist)`)
}

// --- Main ---
async function main() {
  const ghostPath = process.argv[2]

  console.log('🚀 Importing content to Sanity...')
  console.log(`   Project: ${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d'}`)
  console.log(`   Dataset: ${process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'}\n`)

  // 1. Ghost posts (JSON export)
  await importGhostPosts(ghostPath)

  // 2-6. Appwrite content
  await importSiteContent()
  await importExperience()
  await importProjects()
  await importTools()
  await importSocialLinks()

  // 7. Subscribers
  await importSubscribers()

  // 8. Appwrite articles not already from Ghost
  await importAppwriteArticles()

  console.log('\n✅ Import complete!')
  console.log('   Open Sanity Studio at /studio to review and organize content.')
}

main().catch((err) => {
  console.error('\n❌ Import failed:', err.message)
  process.exit(1)
})
