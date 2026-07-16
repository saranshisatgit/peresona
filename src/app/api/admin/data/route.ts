import { NextRequest, NextResponse } from 'next/server'
import { Client, Databases, Query } from 'appwrite'

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

const databases = new Databases(client)
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!

const colMap: Record<string, string | undefined> = {
  site_content: process.env.APPWRITE_SITE_CONTENT_COLLECTION_ID,
  articles: process.env.APPWRITE_ARTICLES_COLLECTION_ID,
  subscribers: process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID,
  projects: process.env.APPWRITE_PROJECTS_COLLECTION_ID,
  experience: process.env.APPWRITE_EXPERIENCE_COLLECTION_ID,
  social_links: process.env.APPWRITE_SOCIAL_LINKS_COLLECTION_ID,
}

export async function GET(request: NextRequest) {
  try {
    const col = request.nextUrl.searchParams.get('col')
    if (!col || !colMap[col]) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 })

    const response = await databases.listDocuments(
      DATABASE_ID,
      colMap[col]!,
      [Query.limit(100)]
    )
    return NextResponse.json(response)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { col, data } = await request.json()
    if (!col || !colMap[col]) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 })

    const result = await databases.createDocument(
      DATABASE_ID,
      colMap[col]!,
      'unique()',
      data,
      ['read("any")']
    )
    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { col, id, data } = await request.json()
    if (!col || !colMap[col] || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const result = await databases.updateDocument(
      DATABASE_ID,
      colMap[col]!,
      id,
      data,
      ['read("any")']
    )
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { col, id } = await request.json()
    if (!col || !colMap[col] || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    await databases.deleteDocument(DATABASE_ID, colMap[col]!, id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
