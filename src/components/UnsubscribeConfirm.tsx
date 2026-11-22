'use client'

import { useState } from 'react'

import { Button } from '@/components/Button'

export function UnsubscribeConfirm({
  token,
  maskedEmail,
}: {
  token: string
  maskedEmail: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  )
  const [error, setError] = useState('')

  async function confirm() {
    setState('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setState('done')
    } catch (err: any) {
      setError(err.message)
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          You&rsquo;re unsubscribed
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {maskedEmail} will receive no more emails. Changed your mind? Just
          subscribe again any time — no hard feelings.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
      <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Unsubscribe from updates?
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        You&rsquo;re about to unsubscribe <strong>{maskedEmail}</strong> from
        all future emails.
      </p>
      <div className="mt-5 flex items-center gap-4">
        <Button onClick={confirm} disabled={state === 'loading'}>
          {state === 'loading' ? '…' : 'Confirm unsubscribe'}
        </Button>
        {state === 'error' && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  )
}
