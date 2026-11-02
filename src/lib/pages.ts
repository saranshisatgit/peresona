import { sanityClient } from '@/sanity/lib/client'
import { urlFor } from '@/lib/api'
import { parseBlocks } from '@/lib/parse-blocks'
import type { Block } from '@blocknote/core'

export interface SharedPage {
  slug: string
  title: string
  emoji: string
  coverUrl: string | null
  blocks: Block[]
  updatedAt: string
}

export async function getSharedPage(slug: string): Promise<SharedPage | null> {
  try {
    const doc = await sanityClient.fetch<{
      title: string
      emoji?: string
      cover?: unknown
      content?: string
      _updatedAt: string
    } | null>(
      `*[_type == "page" && slug.current == $slug && published == true][0] {
        title,
        emoji,
        cover,
        content,
        _updatedAt
      }`,
      { slug },
    )

    if (!doc) return null

    return {
      slug,
      title: doc.title,
      emoji: doc.emoji || '',
      coverUrl: doc.cover ? urlFor(doc.cover, 1600) : null,
      blocks: parseBlocks(doc.content),
      updatedAt: doc._updatedAt,
    }
  } catch {
    return null
  }
}