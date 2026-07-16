import { NextResponse } from 'next/server'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const COLLECTION_ID = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find subscriber by email
    const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents`, {
      headers: {
        'X-Appwrite-Project': PROJECT_ID!,
        'X-Appwrite-Key': API_KEY!,
      },
    })
    const data = await res.json()
    const subscriber = (data.documents || []).find((d: any) => d.email === email)

    if (!subscriber) {
      return NextResponse.json({ message: 'Email not found' }, { status: 404 })
    }

    // Update status to inactive
    await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents/${subscriber.$id}`, {
      method: 'PATCH',
      headers: {
        'X-Appwrite-Project': PROJECT_ID!,
        'X-Appwrite-Key': API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: { status: 'inactive' },
        permissions: ['read("any")'],
      }),
    })

    return NextResponse.json({ message: 'Unsubscribed successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
