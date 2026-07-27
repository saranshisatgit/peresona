import { sanityClient } from '@/sanity/lib/client'
import { type ArticleAccess } from '@/lib/reader-session'

export interface Article {
  title: string
  description: string
  author: string
  date: string
  content?: string
  access?: ArticleAccess
}

export interface ArticleWithSlug extends Article {
  slug: string
}

export async function getAllArticles(): Promise<ArticleWithSlug[]> {
  try {
    const docs = await sanityClient.fetch<ArticleWithSlug[]>(`
      *[_type == "article" && published == true] | order(date desc) {
        "slug": slug.current,
        title,
        description,
        author,
        date,
        access
      }
    `)
    return docs.map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      description: doc.description || '',
      author: doc.author || '',
      date: doc.date,
      access: (doc.access as ArticleAccess) || 'free',
    }))
  } catch {
    return []
  }
}

export async function getArticle(slug: string): Promise<ArticleWithSlug | null> {
  try {
    const doc = await sanityClient.fetch<ArticleWithSlug | null>(
      `*[_type == "article" && slug.current == $slug][0] {
        "slug": slug.current,
        title,
        description,
        content,
        author,
        date,
        access
      }`,
      { slug },
    )
    if (!doc) return null
    return {
      slug: doc.slug,
      title: doc.title,
      description: doc.description || '',
      author: doc.author || '',
      date: doc.date,
      content: doc.content || '',
      access: (doc.access as ArticleAccess) || 'free',
    }
  } catch {
    return null
  }
}
