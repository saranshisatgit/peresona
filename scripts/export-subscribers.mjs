/**
 * Export subscribers from Appwrite in Ghost-compatible JSON format.
 *
 * Usage:
 *   node scripts/export-subscribers.mjs               # prints JSON to stdout
 *   node scripts/export-subscribers.mjs > ghost-subscribers.json
 *
 * The output can be imported into Ghost Admin → Settings → Labs → Import
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

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
const API_KEY = process.env.APPWRITE_API_KEY
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID
const COLLECTION_ID = process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID

if (!ENDPOINT || !PROJECT_ID || !API_KEY || !DATABASE_ID || !COLLECTION_ID) {
  console.error('Missing Appwrite env vars.')
  process.exit(1)
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

async function main() {
  const result = await appwrite('GET', `/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents`)
  const subscribers = result.documents || []

  // Ghost expects this exact JSON structure for import
  const ghostJson = {
    db: [
      {
        meta: {
          exported_on: Date.now(),
          version: '5.0',
        },
        data: {
          subscribers: subscribers
            .filter(s => s.status === 'active')
            .map(s => ({
              id: s.$id,
              name: s.name || '',
              email: s.email,
              status: s.status || 'active',
              subscribed_at: s.$createdAt || new Date().toISOString(),
              unsubscribed_at: null,
              created_at: s.$createdAt || new Date().toISOString(),
              updated_at: s.$updatedAt || new Date().toISOString(),
              source: s.source || 'import',
            })),
        },
      },
    ],
  }

  console.log(JSON.stringify(ghostJson, null, 2))
}

main().catch(err => {
  console.error('Export failed:', err.message)
  process.exit(1)
})
