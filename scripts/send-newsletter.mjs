/**
 * Send a newsletter email to all active subscribers.
 *
 * Usage:
 *   node scripts/send-newsletter.mjs <article-slug>        # send an article
 *   node scripts/send-newsletter.mjs --custom <message.md>  # send custom text
 *
 * Requires env vars in .env.local:
 *   RESEND_API_KEY=re_xxxxxxxx
 *   NEWSLETTER_FROM=newsletter@yourdomain.com
 *   (or the sender verified in Resend)
 *
 * Set up: Go to https://resend.com → API Keys → create key with "Email sending" scope
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.NEWSLETTER_FROM || 'newsletter@yourdomain.com'
const BLOG_NAME = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME || 'Saransh Sharma'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const SUBSCRIBERS_COL = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID
const ARTICLES_COL = process.env.APPWRITE_ARTICLES_COLLECTION_ID

if (!RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY in .env.local')
  console.error('Get one at https://resend.com')
  process.exit(1)
}

const args = process.argv.slice(2)
const mode = args[0]
let articleSlug = null
let customContent = null

if (!mode || mode === '--help') {
  console.log('Usage:')
  console.log('  node scripts/send-newsletter.mjs <article-slug>')
  console.log('  node scripts/send-newsletter.mjs --custom <text>')
  process.exit(0)
} else if (mode === '--custom') {
  customContent = args.slice(1).join(' ') || 'Check out my latest update!'
} else {
  articleSlug = mode
}

async function appwrite(method, path, body) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Appwrite error (${res.status}): ${data.message}`)
  return data
}

async function getSubscribers() {
  const result = await appwrite('GET', `/databases/${DATABASE_ID}/collections/${SUBSCRIBERS_COL}/documents`)
  return (result.documents || []).filter(s => s.status === 'active')
}

async function getArticle(slug) {
  const result = await appwrite('GET', `/databases/${DATABASE_ID}/collections/${ARTICLES_COL}/documents`)
  const doc = (result.documents || []).find(d => d.slug === slug)
  return doc
}

function buildHtml(article) {
  const template = readFileSync(join(__dirname, '../emails/newsletter-template.html'), 'utf-8')
  const date = new Date(article.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  return template
    .replace(/{{TITLE}}/g, article.title)
    .replace(/{{DATE}}/g, date)
    .replace(/{{BODY}}/g, `
      <h2>${article.title}</h2>
      <p>${article.description}</p>
      <div class="article-card">
        ${article.content}
      </div>
      <p><a href="${SITE_URL}/articles/${article.slug}">Read on the web →</a></p>
    `)
    .replace(/{{BLOG_NAME}}/g, BLOG_NAME)
    .replace(/{{UNSUBSCRIBE_URL}}/g, `${SITE_URL}/unsubscribe`)
    .replace(/{{ARCHIVE_URL}}/g, `${SITE_URL}/articles`)
}

function buildCustomHtml(content) {
  const template = readFileSync(join(__dirname, '../emails/newsletter-template.html'), 'utf-8')
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  return template
    .replace(/{{TITLE}}/g, 'Latest Update')
    .replace(/{{DATE}}/g, date)
    .replace(/{{BODY}}/g, `<p>${content}</p>`)
    .replace(/{{BLOG_NAME}}/g, BLOG_NAME)
    .replace(/{{UNSUBSCRIBE_URL}}/g, `${SITE_URL}/unsubscribe`)
    .replace(/{{ARCHIVE_URL}}/g, `${SITE_URL}/articles`)
}

function buildText(article) {
  return `${article.title}\n\n${article.description}\n\nRead more: ${SITE_URL}/articles/${article.slug}`
}

async function sendEmail(to, subject, html, text) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Resend error (${res.status}): ${data.message}`)
  return data
}

async function main() {
  let article = null
  let subject = ''
  let html = ''
  let text = ''

  if (articleSlug) {
    article = await getArticle(articleSlug)
    if (!article) {
      console.error(`Article not found: ${articleSlug}`)
      process.exit(1)
    }
    subject = article.title
    html = buildHtml(article)
    text = buildText(article)
    console.log(`\n📰 Sending: "${article.title}"`)
  } else {
    subject = 'Latest Update'
    html = buildCustomHtml(customContent)
    text = customContent
    console.log(`\n📰 Sending custom update`)
  }

  const subscribers = await getSubscribers()
  console.log(`  Subscribers: ${subscribers.length}`)

  if (subscribers.length === 0) {
    console.log('  No active subscribers. Exiting.')
    return
  }

  let sent = 0
  let failed = 0

  for (const sub of subscribers) {
    try {
      const result = await sendEmail(sub.email, subject, html, text)
      console.log(`  ✓ Sent to ${sub.email} (${result.id})`)
      sent++
    } catch (err) {
      console.error(`  ✗ Failed to ${sub.email}: ${err.message}`)
      failed++
    }
  }

  console.log(`\n✅ Done! ${sent} sent, ${failed} failed.`)
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message)
  process.exit(1)
})
