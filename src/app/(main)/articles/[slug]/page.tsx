import { notFound } from 'next/navigation'

import { Container } from '@/components/Container'
import { Prose } from '@/components/Prose'
import { PostSubscribeForm } from '@/components/PostSubscribeForm'
import { SubscribeGate } from '@/components/SubscribeGate'
import { getArticle, getAllArticles } from '@/lib/articles'
import { formatDate } from '@/lib/formatDate'
import { getVerifiedReaderEmail, isSubscriberOnly } from '@/lib/reader-session'

export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  let articles = await getAllArticles()
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  let { slug } = await params
  let article = await getArticle(slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.description,
  }
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  let { slug } = await params
  let article = await getArticle(slug)

  if (!article) {
    notFound()
  }

  const gated = isSubscriberOnly(article.access)
  const readerEmail = gated ? await getVerifiedReaderEmail() : null
  const canRead = !gated || readerEmail !== null

  return (
    <Container className="mt-16 lg:mt-32">
      <div className="xl:relative">
        <div className="mx-auto max-w-2xl">
          <article>
            <header className="flex flex-col">
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
                {article.title}
              </h1>
              <time
                dateTime={article.date}
                className="order-first flex items-center text-base text-zinc-400 dark:text-zinc-500"
              >
                <span className="h-4 w-0.5 rounded-full bg-zinc-200 dark:bg-zinc-500" />
                <span className="ml-3">{formatDate(article.date)}</span>
              </time>
            </header>

            {canRead ? (
              <Prose
                className="mt-8"
                dangerouslySetInnerHTML={{ __html: article.content || '' }}
              />
            ) : (
              <div className="mt-8">
                <Prose
                  dangerouslySetInnerHTML={{
                    __html: `<p>${article.description || ''}</p>`,
                  }}
                />
                <SubscribeGate />
              </div>
            )}
          </article>

          {canRead && (
            <div className="mt-16">
              <PostSubscribeForm />
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
