/**
 * Transfer images from Appwrite storage URLs to Sanity image assets.
 * Downloads each image URL, uploads to Sanity, and patches the document.
 *
 * Usage: node scripts/transfer-images.mjs
 */

import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) dotenv.config({ path: envPath })

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '3dxvlt1d',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
})

async function main() {
  console.log('\n🖼️  Transferring images from Appwrite to Sanity...\n')

  const docs = await sanity.fetch(`*[_type == "siteContent"]{_id, key, value, image}`)

  for (const doc of docs) {
    const url = doc.value
    if (!url || !url.startsWith || !url.startsWith('http')) continue

    console.log(`  ⬇️  Downloading ${doc.key}...`)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      const contentType = res.headers.get('content-type') || 'image/jpeg'
      const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
      const filename = `${doc.key}.${ext}`

      console.log(`  ⬆️  Uploading to Sanity as ${filename} (${(buffer.length / 1024).toFixed(0)}KB)...`)
      const asset = await sanity.assets.upload('image', buffer, {
        filename,
        contentType,
      })

      console.log(`  📝  Patching ${doc._id} → image ref ${asset._id}`)
      await sanity.patch(doc._id).set({
        image: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        },
        value: '',
      }).commit()

      console.log(`  ✅ ${doc.key}\n`)
    } catch (err) {
      console.error(`  ❌ ${doc.key}: ${err.message}\n`)
    }
  }

  console.log('✅ Done!')
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message)
  process.exit(1)
})
