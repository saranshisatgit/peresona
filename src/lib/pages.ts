import { sanityClient } from '@/sanity/lib/client'
import { urlFor } from '@/lib/api'

export interface SharedPage {
  slug: string
  title: string
  emoji: string
  coverUrl: string | null
  /** Raw BlockNote JSON string — parsed and rendered by PageContent (client). */
  content: string | null
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
      content: doc.content || null,
      updatedAt: doc._updatedAt,
    }
  } catch {
    return null
  }
}