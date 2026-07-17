import { Client, Databases, Query } from 'node-appwrite'
import { type ArticleAccess } from '@/lib/reader-session'

export interface AppwriteArticle {
  slug: string
  title: string
  description: string
  content: string
  author: string
  date: string
  published: boolean
  access?: ArticleAccess
}

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

const databases = new Databases(client)
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!
const ARTICLES_COLLECTION_ID = process.env.APPWRITE_ARTICLES_COLLECTION_ID!

export async function getArticles(): Promise<AppwriteArticle[]> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ARTICLES_COLLECTION_ID,
      [Query.limit(100)]
    )
    return response.documents
      .map((doc: any) => ({
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        content: doc.content,
        author: doc.author,
        date: doc.date,
        published: doc.published,
        access: doc.access,
      }))
      .filter((article: AppwriteArticle) => article.published)
      .sort((a: AppwriteArticle, z: AppwriteArticle) => +new Date(z.date) - +new Date(a.date))
  } catch {
    return []
  }
}

export async function getArticleBySlug(slug: string): Promise<AppwriteArticle | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      ARTICLES_COLLECTION_ID,
      [Query.equal('slug', slug), Query.limit(1)]
    )
    const doc = response.documents[0] as any
    if (!doc) return null
    return {
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      content: doc.content,
      author: doc.author,
      date: doc.date,
      published: doc.published,
      access: doc.access,
    }
  } catch {
    return null
  }
}
