import { getArticles, getArticleBySlug, type AppwriteArticle } from '@/lib/appwrite'

export interface Article {
  title: string
  description: string
  author: string
  date: string
  content?: string
}

export interface ArticleWithSlug extends Article {
  slug: string
}

export async function getAllArticles(): Promise<ArticleWithSlug[]> {
  const articles = await getArticles()
  return articles.map((a: AppwriteArticle) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    author: a.author,
    date: a.date,
  }))
}

export async function getArticle(slug: string): Promise<ArticleWithSlug | null> {
  const article = await getArticleBySlug(slug)
  if (!article) return null
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    author: article.author,
    date: article.date,
    content: article.content,
  }
}
