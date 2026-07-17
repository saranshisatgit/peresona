'use client'

import { useState } from 'react'

import { Button } from '@/components/Button'

type Status = { type: 'idle' | 'loading' | 'error' | 'success'; msg?: string }

export function SubscribeGate() {
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'subscribe' | 'verify'>('subscribe')
  const [status, setStatus] = useState<Status>({ type: 'idle' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus({ type: 'loading' })
    try {
      const endpoint =
        mode === 'subscribe' ? '/api/subscribe' : '/api/reader/verify'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }
      setStatus({
        type: 'success',
        msg:
          mode === 'subscribe' ? 'Subscribed! Unlocking…' : 'Verified! Unlocking…',
      })
      setTimeout(() => window.location.reload(), 700)
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message })
    }
  }

  return (
    <div className="mt-10 rounded-2xl border border-zinc-100 p-6 dark:border-zinc-700/40">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        This post is for subscribers
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Enter your email to read the full article. Your email is stored so you
        stay signed in across posts.
      </p>
      <form onSubmit={submit} className="mt-5 flex items-center">
        <span className="flex min-w-0 flex-auto p-px">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            required
            className="w-full appearance-none rounded-[calc(var(--radius-md)-1px)] bg-white px-3 py-[calc(--spacing(2)-1px)] shadow-md shadow-zinc-800/5 outline outline-zinc-900/10 placeholder:text-zinc-400 focus:ring-4 focus:ring-teal-500/10 focus:outline-teal-500 sm:text-sm dark:bg-zinc-700/15 dark:text-zinc-200 dark:outline-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-teal-400/10 dark:focus:outline-teal-400"
          />
        </span>
        <Button type="submit" className="ml-4 flex-none">
          {status.type === 'loading'
            ? '…'
            : mode === 'subscribe'
              ? 'Subscribe & read'
              : 'Sign in & read'}
        </Button>
      </form>
      <div className="mt-3 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() =>
            setMode((m) => (m === 'subscribe' ? 'verify' : 'subscribe'))
          }
          className="text-teal-600 hover:underline dark:text-teal-400"
        >
          {mode === 'subscribe'
            ? 'Already a subscriber? Sign in'
            : 'New here? Subscribe instead'}
        </button>
        {status.type === 'error' && (
          <span className="text-red-500">{status.msg}</span>
        )}
        {status.type === 'success' && (
          <span className="text-teal-500">{status.msg}</span>
        )}
      </div>
    </div>
  )
}
