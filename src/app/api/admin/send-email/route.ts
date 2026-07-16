import { NextRequest, NextResponse } from 'next/server'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DB_ID = process.env.APPWRITE_DATABASE_ID
const SUBS_COL = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID
const ARTICLES_COL = process.env.APPWRITE_ARTICLES_COLLECTION_ID

async function appwrite(method: string, path: string, body?: any) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers: {
      'X-Appwrite-Project': PROJECT_ID!,
      'X-Appwrite-Key': API_KEY!,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

export async function POST(request: NextRequest) {
  try {
    const { subject, body, articleSlug, targets } = await request.json()
    if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })

    const subsData = await appwrite('GET', `/databases/${DB_ID}/collections/${SUBS_COL}/documents`)
    let activeSubs = (subsData.documents || []).filter((s: any) => s.status === 'active')

    if (targets && targets !== '__all__' && Array.isArray(targets)) {
      activeSubs = activeSubs.filter((s: any) => targets.includes(s.$id))
    }

    if (activeSubs.length === 0) return NextResponse.json({ error: 'No matching subscribers' }, { status: 400 })

    let htmlBody = body || ''
    if (articleSlug) {
      const arts = await appwrite('GET', `/databases/${DB_ID}/collections/${ARTICLES_COL}/documents`)
      const article = (arts.documents || []).find((a: any) => a.slug === articleSlug)
      if (article) {
        htmlBody = `<h2>${article.title}</h2><p>${article.description}</p>${article.content || ''}`
      }
    }

    let sent = 0
    const errors: string[] = []

    for (const sub of activeSubs) {
      try {
        await appwrite('POST', `/messaging/messages/email`, {
          messageId: 'unique()',
          subject,
          content: htmlBody,
          to: [sub.email],
          cc: [],
          bcc: [],
          html: true,
          draft: false,
        })
        sent++
      } catch (err: any) {
        errors.push(`${sub.email}: ${err.message}`)
      }
    }

    return NextResponse.json({
      sent,
      errors: errors.length > 0 ? errors : undefined,
      total: activeSubs.length,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
