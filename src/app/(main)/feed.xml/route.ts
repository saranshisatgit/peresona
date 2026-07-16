import { getAllArticles } from '@/lib/articles'
import { Feed } from 'feed'

export async function GET() {
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  let author = { name: 'Saransh Sharma', email: 'saransh@planetaria.tech' }

  let feed = new Feed({
    title: author.name,
    description: 'Personal blog of Saransh Sharma',
    author,
    id: siteUrl,
    link: siteUrl,
    image: `${siteUrl}/favicon.ico`,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    feedLinks: { rss2: `${siteUrl}/feed.xml` },
  })

  let articles = await getAllArticles()

  for (let article of articles) {
    let publicUrl = `${siteUrl}/articles/${article.slug}`
    feed.addItem({
      title: article.title,
      id: publicUrl,
      link: publicUrl,
      description: article.description,
      author: [author],
      contributor: [author],
      date: new Date(article.date),
    })
  }

  return new Response(feed.rss2(), {
    status: 200,
    headers: {
      'content-type': 'application/xml',
      'cache-control': 's-maxage=31556952',
    },
  })
}
