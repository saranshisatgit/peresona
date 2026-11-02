import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

import { Container } from '@/components/Container'
import { PageContentLoader } from '@/components/PageContentLoader'
import { getSharedPage } from '@/lib/pages'
import { formatDateTime } from '@/lib/formatDate'

import '@/styles/notion.css'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  let { slug } = await params
  let page = await getSharedPage(slug)
  if (!page) return { title: 'Page not found' }
  return {
    title: page.emoji ? `${page.emoji} ${page.title}` : page.title,
    description: `A shared page by Saransh Sharma — ${page.title}`,
  }
}

export default async function SharedPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  let { slug } = await params
  let page = await getSharedPage(slug)

  if (!page) {
    notFound()
  }

  return (
    <Container className="mt-16 lg:mt-32">
      <article className="mx-auto max-w-3xl">
        {page.coverUrl && (
          <div className="relative mb-10 aspect-21/9 w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
            <Image
              src={page.coverUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 768px, 100vw"
              className="object-cover"
            />
          </div>
        )}

        <header className="mb-10">
          <div className="flex items-start gap-4">
            {page.emoji && (
              <span
                aria-hidden="true"
                className="mt-1.5 text-4xl leading-none sm:text-5xl"
              >
                {page.emoji}
              </span>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-zinc-800 sm:text-4xl dark:text-zinc-100">
              {page.title}
            </h1>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 font-medium text-teal-600 dark:text-teal-400">
              Shared page
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={page.updatedAt}>
              Last edited {formatDateTime(page.updatedAt)}
            </time>
          </div>
        </header>

        <PageContentLoader content={page.content} />

        <footer className="mt-16 border-t border-zinc-100 pt-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          This page was shared with you by Saransh. Only people with the link
          can see it.{' '}
          <Link
            href="/articles"
            className="font-medium text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300"
          >
            Read more writing →
          </Link>
        </footer>
      </article>
    </Container>
  )
}