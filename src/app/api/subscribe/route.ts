import { NextResponse } from 'next/server'

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
          email,
          name: '',
          status: 'active',
          source: 'website',
        },
        permissions: ['read("any")'],
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      if (data.message?.includes('already exists')) {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 })
      }
      throw new Error(data.message)
    }

    return NextResponse.json({ message: 'Subscribed successfully' }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
