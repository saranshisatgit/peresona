import { UnsubscribeConfirm } from '@/components/UnsubscribeConfirm'
import { verifyUnsubscribeToken } from '@/lib/reader-session'
import { maskEmail } from '@/lib/subscriber-crypto'

export const metadata = {
  title: 'Unsubscribe - Saransh Sharma',
  robots: { index: false, follow: false },
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : null
  const email = verifyUnsubscribeToken(token)

  if (!email) {
    return (
      <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          This link isn&rsquo;t working
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The unsubscribe link is invalid or incomplete. Use the exact link
          from a recent email — or reply to any newsletter and I&rsquo;ll
          remove you manually.
        </p>
      </div>
    )
  }

  return (
    <UnsubscribeConfirm token={token!} maskedEmail={maskEmail(email)} />
  )
}
