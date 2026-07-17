import { NextResponse } from 'next/server'

import {
  signReaderToken,
  READER_COOKIE,
  readerCookieOptions,
} from '@/lib/reader-session'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const COLLECTION_ID = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': PROJECT_ID!,
        'X-Appwrite-Key': API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          email: normalizedEmail,
          name: '',
          status: 'active',
          source: 'website',
        },
        permissions: ['read("any")'],
      }),
    })

    let alreadySubscribed = false
    if (!res.ok) {
      const data = await res.json()
      if (data.message?.includes('already exists')) {
        alreadySubscribed = true
      } else {
        throw new Error(data.message)
      }
    }

    const response = NextResponse.json(
      { message: alreadySubscribed ? 'Already subscribed' : 'Subscribed successfully' },
      { status: alreadySubscribed ? 200 : 201 },
    )
    response.cookies.set(
      READER_COOKIE,
      signReaderToken(normalizedEmail),
      readerCookieOptions,
    )
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
