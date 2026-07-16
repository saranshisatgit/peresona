import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/admin-auth'

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const BUCKET_ID = process.env.APPWRITE_STORAGE_BUCKET_ID

export async function POST(request: NextRequest) {
  try {
    const authed = await checkApiAuth()
    if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!BUCKET_ID) {
      return NextResponse.json({ error: 'Storage bucket not configured. Set APPWRITE_STORAGE_BUCKET_ID.' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const res = await fetch(`${ENDPOINT}/storage/files`, {
      method: 'POST',
      headers: {
        'X-Appwrite-Project': PROJECT_ID!,
        'X-Appwrite-Key': API_KEY!,
        'Content-Type': 'multipart/form-data',
      },
      body: (() => {
        const boundary = `----formdata-appwrite-${Date.now()}`
        const parts: Buffer[] = []
        parts.push(Buffer.from(`--${boundary}\r\n`))
        parts.push(Buffer.from(`Content-Disposition: form-data; name="fileId"\r\n\r\n`))
        parts.push(Buffer.from(`unique()\r\n`))
        parts.push(Buffer.from(`--${boundary}\r\n`))
        parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`))
        parts.push(Buffer.from(`Content-Type: ${file.type}\r\n\r\n`))
        parts.push(buffer)
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))
        return Buffer.concat(parts)
      })(),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || `Upload failed (${res.status})` }, { status: res.status })
    }

    const fileId = data.$id
    const viewUrl = `${ENDPOINT}/storage/files/${fileId}/view?project=${PROJECT_ID}`

    return NextResponse.json({ url: viewUrl, fileId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
