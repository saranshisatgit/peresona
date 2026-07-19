import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const apiKey = process.env.APPWRITE_API_KEY

if (!endpoint || !projectId || !apiKey) {
  console.error('Missing required env vars')
  process.exit(1)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

const headers = {
  'X-Appwrite-Project': projectId,
  'X-Appwrite-Key': apiKey,
  'Content-Type': 'application/json',
}

async function api(method, path, body) {
  const url = `${endpoint}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`)
    err.code = res.status
    err.type = data.type
    throw err
  }
  return data
}

async function ensureDatabase() {
  const dbs = await api('GET', '/databases')
  const existing = dbs.databases?.find(d => d.name === 'personal_blog')
  if (existing) {
    console.log(`  ✓ Database: ${existing.$id}`)
    return existing.$id
  }

  const db = await api('POST', '/databases', {
    databaseId: 'unique()',
    name: 'personal_blog',
  })
  console.log(`  ✓ Created database: ${db.$id}`)
  return db.$id
}

async function ensureCollection(dbId, name) {
  const cols = await api('GET', `/databases/${dbId}/collections`)
  const existing = cols.collections?.find(c => c.name === name)
  if (existing) {
    console.log(`  ✓ Collection: ${name} (${existing.$id})`)
    return existing.$id
  }

  const col = await api('POST', `/databases/${dbId}/collections`, {
    collectionId: 'unique()',
    name,
    permissions: ['read("any")'],
    documentSecurity: false,
  })
  console.log(`  ✓ Created collection: ${name} (${col.$id})`)
  return col.$id
}

async function ensureAttribute(dbId, colId, type, key, options = {}) {
  const { size, required = true, array = false, default: def } = options

  // Check existing attributes
  const attrs = await api('GET', `/databases/${dbId}/collections/${colId}/attributes`)
  const existing = attrs.attributes?.find(a => a.key === key)
  if (existing) {
    console.log(`    ✓ Attribute: ${key} (${type})`)
    return
  }

  const body = { key, required, array, default: def }
  if (type === 'string') body.size = size ?? 65535
  if (type === 'integer') { body.min = 0; body.max = 999999 }

  await api('POST', `/databases/${dbId}/collections/${colId}/attributes/${type}`, body)
  console.log(`    ✓ Attribute: ${key} (${type})`)
}

async function ensureDocument(dbId, colId, data, uniqueKey) {
  const docs = await api('GET', `/databases/${dbId}/collections/${colId}/documents`)
  const exists = docs.documents?.some(d => d[uniqueKey] === data[uniqueKey])
  if (exists) {
    console.log(`    ~ Exists: ${data[uniqueKey] || data.name || data.title || data.platform}`)
    return
  }

  await api('POST', `/databases/${dbId}/collections/${colId}/documents`, {
    documentId: 'unique()',
    data,
    permissions: ['read("any")'],
  })
  console.log(`    ✓ Seeded: ${data[uniqueKey] || data.name || data.title || data.platform}`)
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
console.log('\n🚀 Setting up Appwrite for saranshsharma.me\n')

const dbId = await ensureDatabase()

// Reusable helper to set up a collection with attributes + seed data
async function setupCollection(name, attributes, seedData = [], uniqueKey = 'key') {
  console.log(`\n📁 ${name}...`)
  const colId = await ensureCollection(dbId, name)
  for (const attr of attributes) {
    try {
      await ensureAttribute(dbId, colId, attr.type, attr.key, attr.options ?? {})
    } catch (e) {
      if (e.message?.includes('already exists')) continue
      console.log(`    ~ Skipping attribute ${attr.key}: ${e.message}`)
    }
  }
  // Wait for attributes to be available before seeding
  await new Promise(r => setTimeout(r, 2000))
  for (const doc of seedData) {
    await ensureDocument(dbId, colId, doc, uniqueKey)
  }
  return colId
}

const collections = {}


collections.siteContent = await setupCollection('site_content', [
  { type: 'string', key: 'key' },
  { type: 'string', key: 'value', options: { size: 65535 } },
], [
  { key: 'home_heading', value: 'Software designer, founder, and amateur astronaut.' },
  { key: 'home_description', value: "I'm Saransh, a software designer and entrepreneur based in New York City. I'm the founder and CEO of Planetaria, where we develop technologies that empower regular people to explore space on their own terms." },
  { key: 'articles_title', value: 'Writing on software design, company building, and the aerospace industry.' },
  { key: 'articles_intro', value: 'All of my long-form thoughts on programming, leadership, product design, and more, collected in chronological order.' },
  { key: 'projects_title', value: "Things I've made trying to put my dent in the universe." },
  { key: 'projects_intro', value: "I've worked on tons of little projects over the years but these are the ones that I'm most proud of. Many of them are open-source, so if you see something that piques your interest, check out the code and contribute if you have ideas for how it can be improved." },
  { key: 'uses_title', value: 'Software I use, gadgets I love, and other things I recommend.' },
  { key: 'uses_intro', value: "I get asked a lot about the things I use to build software, stay productive, or buy to fool myself into thinking I'm being productive when I'm really just procrastinating. Here's a big list of all of my favorite stuff." },
  { key: 'about_title', value: "I'm Saransh Sharma. I live in New York City, where I design the future." },
  { key: 'about_paragraphs', value: JSON.stringify([
    "I've loved making things for as long as I can remember, and wrote my first program when I was 6 years old, just two weeks after my mom brought home the brand new Macintosh LC 550 that I taught myself to type on.",
    "The only thing I loved more than computers as a kid was space. When I was 8, I climbed the 40-foot oak tree at the back of our yard while wearing my older sister's motorcycle helmet, counted down from three, and jumped — hoping the tree was tall enough that with just a bit of momentum I'd be able to get to orbit.",
    "I spent the next few summers indoors working on a rocket design, while I recovered from the multiple surgeries it took to fix my badly broken legs. It took nine iterations, but when I was 15 I sent my dad's Blackberry into orbit and was able to transmit a photo back down to our family computer from space.",
    "Today, I'm the founder of Planetaria, where we're working on civilian space suits and manned shuttle kits you can assemble at home so that the next generation of kids really *can* make it to orbit — from the comfort of their own backyards.",
  ])},
  { key: 'about_email', value: 'saransh@planetaria.tech' },
  { key: 'footer_copyright', value: 'Saransh Sharma' },
], 'key')


collections.articles = await setupCollection('articles', [
  { type: 'string', key: 'slug' },
  { type: 'string', key: 'title' },
  { type: 'string', key: 'description', options: { size: 65535 } },
  { type: 'string', key: 'content', options: { size: 16777215 } },
  { type: 'string', key: 'author' },
  { type: 'string', key: 'date' },
  { type: 'boolean', key: 'published' },
  { type: 'string', key: 'access', options: { size: 32, required: false, default: 'free' } },
], [
  { slug: 'crafting-a-design-system-for-a-multiplanetary-future', title: 'Crafting a design system for a multiplanetary future', description: 'Most companies try to stay ahead of the curve when it comes to visual design, but for Planetaria we needed to create a brand that would still inspire us 100 years from now when humanity has spread across our entire solar system.', content: '<p>Most companies try to stay ahead of the curve when it comes to visual design, but for Planetaria we needed to create a brand that would still inspire us 100 years from now when humanity has spread across our entire solar system.</p><p>I knew that to get it right I was going to have to replicate the viewing conditions of someone from the future, so I grabbed my space helmet from the closet, created a new Figma document, and got to work.</p><h2>Sermone fata</h2><p>Lorem markdownum, bracchia in redibam! Terque unda puppi nec, linguae posterior in utraque respicere candidus Mimasque formae; quae conantem cervice.</p>', author: 'Saransh Sharma', date: '2022-09-05', published: true },
  { slug: 'introducing-animaginary', title: 'Introducing Animaginary: High performance web animations', description: "When you're building a website for a company as ambitious as Planetaria, you need to make an impression. I wanted people to visit our website and see animations that looked more realistic than reality itself.", content: '<p>When you are building a website for a company as ambitious as Planetaria, you need to make an impression. I wanted people to visit our website and see animations that looked more realistic than reality itself.</p><p>I spent months researching the latest advances in web animation technology, and eventually created a library that could produce animations so smooth, they would make your audience feel like they were actually there.</p>', author: 'Saransh Sharma', date: '2022-09-02', published: true },
  { slug: 'rewriting-the-cosmos-kernel-in-rust', title: 'Rewriting the cosmOS kernel in Rust', description: 'When we released the first version of cosmOS last year, it was written in Go. Go is a wonderful programming language with a great community, but it turned out to not be the right choice for a real-time operating system.', content: '<p>When we released the first version of cosmOS last year, it was written in Go. Go is a wonderful programming language with a great community, but it turned out to not be the right choice for a real-time operating system.</p><p>We made the decision to rewrite the kernel in Rust, and the results have been nothing short of remarkable. Memory safety, zero-cost abstractions, and fearless concurrency have made our system both faster and more reliable.</p>', author: 'Saransh Sharma', date: '2022-07-14', published: true },
], 'slug')


collections.experience = await setupCollection('experience', [
  { type: 'string', key: 'company' },
  { type: 'string', key: 'title' },
  { type: 'string', key: 'logo' },
  { type: 'string', key: 'start' },
  { type: 'string', key: 'end' },
  { type: 'integer', key: 'sort_order' },
], [
  { company: 'Planetaria', title: 'CEO', logo: 'planetaria', start: '2019', end: new Date().getFullYear().toString(), sort_order: 1 },
  { company: 'Airbnb', title: 'Product Designer', logo: 'airbnb', start: '2014', end: '2019', sort_order: 2 },
  { company: 'Facebook', title: 'iOS Software Engineer', logo: 'facebook', start: '2011', end: '2014', sort_order: 3 },
  { company: 'Starbucks', title: 'Shift Supervisor', logo: 'starbucks', start: '2008', end: '2011', sort_order: 4 },
], 'company')


collections.projects = await setupCollection('projects', [
  { type: 'string', key: 'name' },
  { type: 'string', key: 'description', options: { size: 65535 } },
  { type: 'string', key: 'url' },
  { type: 'string', key: 'label' },
  { type: 'string', key: 'logo' },
  { type: 'integer', key: 'sort_order' },
], [
  { name: 'Planetaria', description: 'Creating technology to empower civilians to explore space on their own terms.', url: 'http://planetaria.tech', label: 'planetaria.tech', logo: 'planetaria', sort_order: 1 },
  { name: 'Animaginary', description: 'High performance web animation library, hand-written in optimized WASM.', url: '#', label: 'github.com', logo: 'animaginary', sort_order: 2 },
  { name: 'HelioStream', description: 'Real-time video streaming library, optimized for interstellar transmission.', url: '#', label: 'github.com', logo: 'helio-stream', sort_order: 3 },
  { name: 'cosmOS', description: 'The operating system that powers our Planetaria space shuttles.', url: '#', label: 'github.com', logo: 'cosmos', sort_order: 4 },
  { name: 'OpenShuttle', description: 'The schematics for the first rocket I designed that successfully made it to orbit.', url: '#', label: 'github.com', logo: 'open-shuttle', sort_order: 5 },
], 'name')


collections.tools = await setupCollection('tools', [
  { type: 'string', key: 'section' },
  { type: 'string', key: 'title', options: { size: 65535 } },
  { type: 'string', key: 'description', options: { size: 65535 } },
  { type: 'string', key: 'url' },
  { type: 'integer', key: 'sort_order' },
], [
  { section: 'Workstation', title: '16-inch MacBook Pro, M1 Max, 64GB RAM (2021)', description: "I was using an Intel-based 16-inch MacBook Pro prior to this and the difference is night and day. I've never heard the fans turn on a single time.", url: '', sort_order: 1 },
  { section: 'Workstation', title: 'Apple Pro Display XDR (Standard Glass)', description: "The only display on the market if you want something HiDPI and bigger than 27 inches. When you're working at planetary scale, every pixel you can get counts.", url: '', sort_order: 2 },
  { section: 'Workstation', title: 'Herman Miller Aeron Chair', description: "If I'm going to slouch in the worst ergonomic position imaginable all day, I might as well do it in an expensive chair.", url: '', sort_order: 3 },
  { section: 'Development tools', title: 'Sublime Text 4', description: "I don't care if it's missing all of the fancy IDE features everyone else relies on, Sublime Text is still the best text editor ever made.", url: '', sort_order: 1 },
  { section: 'Development tools', title: 'iTerm2', description: "I'm honestly not even sure what features I get with this that aren't just part of the macOS Terminal but it's what I use.", url: '', sort_order: 2 },
  { section: 'Development tools', title: 'TablePlus', description: 'Great software for working with databases. Has saved me from building about a thousand admin interfaces.', url: '', sort_order: 3 },
  { section: 'Design', title: 'Figma', description: "We started using Figma as just a design tool but now it's become our virtual whiteboard for the entire company.", url: '', sort_order: 1 },
  { section: 'Productivity', title: 'Alfred', description: "It's not the newest kid on the block but it's still the fastest. The Sublime Text of the application launcher world.", url: '', sort_order: 1 },
  { section: 'Productivity', title: 'Reflect', description: 'Using a daily notes system instead of trying to keep things organized by topics has been super powerful for me.', url: '', sort_order: 2 },
  { section: 'Productivity', title: 'SavvyCal', description: 'Great tool for scheduling meetings while protecting my calendar and making sure I still have lots of time for deep work.', url: '', sort_order: 3 },
], 'title')


collections.socialLinks = await setupCollection('social_links', [
  { type: 'string', key: 'platform' },
  { type: 'string', key: 'url' },
  { type: 'string', key: 'label' },
  { type: 'integer', key: 'sort_order' },
], [
  { platform: 'x', url: '#', label: 'Follow on X', sort_order: 1 },
  { platform: 'instagram', url: '#', label: 'Follow on Instagram', sort_order: 2 },
  { platform: 'github', url: '#', label: 'Follow on GitHub', sort_order: 3 },
  { platform: 'linkedin', url: '#', label: 'Follow on LinkedIn', sort_order: 4 },
], 'platform')


collections.subscribers = await setupCollection('subscribers', [
  { type: 'string', key: 'email' },
  { type: 'string', key: 'name' },
  { type: 'string', key: 'status' },
  { type: 'string', key: 'source' },
], [
  { email: 'saransh@planetaria.tech', name: 'Saransh Sharma', status: 'active', source: 'manual' },
], 'email')


// ------------------------------------------------------------------
// Storage bucket
// ------------------------------------------------------------------
let bucketId
try {
  console.log('\n🪣 Storage bucket...')
  const buckets = await api('GET', '/storage/buckets')
  const existing = buckets.buckets?.find(b => b.name === 'media')
  if (existing) {
    bucketId = existing.$id
    console.log(`  ✓ Bucket: media (${bucketId})`)
  } else {
    const bucket = await api('POST', '/storage/buckets', {
      bucketId: 'unique()',
      name: 'media',
      permissions: ['read("any")'],
      fileSecurity: false,
      compression: 'none',
      encryption: false,
      antivirus: false,
    })
    bucketId = bucket.$id
    console.log(`  ✓ Created bucket: media (${bucketId})`)
  }
} catch (err) {
  console.log('  ~ Could not create bucket:', err.message)
  console.log('  Create manually in Appwrite Console → Storage → Add Bucket (name: media)')
}


// ------------------------------------------------------------------
// Create admin user
// ------------------------------------------------------------------
try {
  console.log('\n👤 Admin user...')
  const dbsList = await api('GET', '/users')
  const existingAdmin = dbsList.users?.find(u => u.email === 'admin@saranshsharma.me')
  if (existingAdmin) {
    console.log(`  ✓ Admin exists: ${existingAdmin.email}`)
    console.log('  Update password in Appwrite Console → Auth → Users')
  } else {
    console.log('  Creating admin user...')
    console.log('  Default credentials: admin@saranshsharma.me / admin123!')
    await api('POST', '/users', {
      userId: 'unique()',
      email: 'admin@saranshsharma.me',
      password: 'admin123!',
      name: 'Admin',
    })
    console.log('  ✓ Created: admin@saranshsharma.me')
    console.log('  ⚠️  CHANGE THIS PASSWORD in Appwrite Console after first login!')
  }
} catch (err) {
  // users endpoints might need users.* scope
  console.log('  ~ Could not create admin user:', err.message)
  console.log('  Create manually in Appwrite Console → Auth → Users')
  console.log('  Email: admin@saranshsharma.me, Password: admin123!')
}


// ------------------------------------------------------------------
// Update .env.local
// ------------------------------------------------------------------
const envUpdates = {
  APPWRITE_DATABASE_ID: dbId,
  APPWRITE_SITE_CONTENT_COLLECTION_ID: collections.siteContent,
  APPWRITE_ARTICLES_COLLECTION_ID: collections.articles,
  APPWRITE_EXPERIENCE_COLLECTION_ID: collections.experience,
  APPWRITE_PROJECTS_COLLECTION_ID: collections.projects,
  APPWRITE_TOOLS_COLLECTION_ID: collections.tools,
  APPWRITE_SOCIAL_LINKS_COLLECTION_ID: collections.socialLinks,
  APPWRITE_SUBSCRIBERS_COLLECTION_ID: collections.subscribers,
  APPWRITE_STORAGE_BUCKET_ID: bucketId,
}

console.log('\n📝 Updating .env.local...')
let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
for (const [key, value] of Object.entries(envUpdates)) {
  if (value) {
    const regex = new RegExp(`^${key}=.*`, 'm')
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`)
    } else {
      envContent += `\n${key}=${value}`
    }
  }
}
writeFileSync(envPath, envContent.trim() + '\n')

console.log('\n✅ Setup complete! All 6 collections created and seeded.')
console.log(`\nIDs saved to .env.local:`)
for (const [k, v] of Object.entries(envUpdates)) {
  console.log(`  ${k}=${v}`)
}
