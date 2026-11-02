'use client'

import { Suspense } from 'react'
import nextDynamic from 'next/dynamic'

// BlockNote is client-only (it touches `window` during render), so it is
// loaded with `ssr: false` from this client wrapper — see BlockNote's
// Next.js guidance.
const PageContent = nextDynamic(
  () => import('@/components/PageContent').then((mod) => mod.PageContent),
  { ssr: false },
)

function PageContentSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-8 w-3/4 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-4 w-11/12 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-4 w-4/5 rounded bg-zinc-100 dark:bg-zinc-800" />
    </div>
  )
}

export function PageContentLoader({
  content,
}: {
  content: string | null | undefined
}) {
  return (
    <Suspense fallback={<PageContentSkeleton />}>
      <PageContent content={content} />
    </Suspense>
  )
}