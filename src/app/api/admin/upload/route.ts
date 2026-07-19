 import { NextRequest, NextResponse } from 'next/server'
 import { Client, Storage } from 'node-appwrite'
 import { checkApiAuth } from '@/lib/admin-auth'

 const client = new Client()
   .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
   .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
   .setKey(process.env.APPWRITE_API_KEY!)

 const storage = new Storage(client)
 const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
 const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
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

     const created = await storage.createFile(
       BUCKET_ID,
       'unique()',
       new File([new Uint8Array(buffer)], file.name, { type: file.type || 'application/octet-stream' }),
       ['read("any")'],
     )

     const fileId = created.$id
     const viewUrl = `${ENDPOINT}/storage/files/${fileId}/view?project=${PROJECT_ID}&bucket=${BUCKET_ID}`

     return NextResponse.json({ url: viewUrl, fileId })
   } catch (err: any) {
     return NextResponse.json({ error: err.message }, { status: 500 })
   }
 }
