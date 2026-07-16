'use client'

import { useEffect, useState } from 'react'

interface Subscriber {
  $id: string
  email: string
  name: string
  status: string
  source: string
}

export default function SubscribersManager() {
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [showSend, setShowSend] = useState(false)
  const [emailForm, setEmailForm] = useState({ subject: '', body: '', articleSlug: '' })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [articles, setArticles] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/data?col=subscribers')
      .then((r) => r.json())
      .then((d) => setSubs(d.documents || []))
    fetch('/api/admin/data?col=articles')
      .then((r) => r.json())
      .then((d) => setArticles((d.documents || []).filter((a: any) => a.published)))
  }, [])

  async function sendEmail() {
    setSending(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage(`Sent to ${data.sent} subscribers!`)
      setShowSend(false)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setSending(false)
  }

  const activeSubs = subs.filter((s) => s.status === 'active')

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscribers</h1>
          <p className="text-sm text-zinc-400">{activeSubs.length} active · {subs.length} total</p>
        </div>
        <button onClick={() => setShowSend(!showSend)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500">
          {showSend ? 'Cancel' : 'Send Email'}
        </button>
      </div>

      {message && <div className="mt-3 text-sm text-teal-400">{message}</div>}

      {showSend && (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Send Email to All Active Subscribers</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500">Subject</label>
              <input value={emailForm.subject} onChange={(e) => setEmailForm((p) => ({ ...p, subject: e.target.value }))} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500">
                Or pick an article to send
              </label>
              <select
                value={emailForm.articleSlug}
                onChange={(e) => {
                  const slug = e.target.value
                  const article = articles.find((a: any) => a.slug === slug)
                  setEmailForm((p) => ({
                    ...p,
                    articleSlug: slug,
                    subject: article ? article.title : p.subject,
                  }))
                }}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
              >
                <option value="">-- Write custom --</option>
                {articles.map((a: any) => (
                  <option key={a.slug} value={a.slug}>{a.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500">Body (HTML, only if not sending an article)</label>
              <textarea value={emailForm.body} onChange={(e) => setEmailForm((p) => ({ ...p, body: e.target.value }))} rows={6} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-teal-500 focus:outline-none" />
            </div>
            <button onClick={sendEmail} disabled={sending || !emailForm.subject} className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50">
              {sending ? 'Sending...' : `Send to ${activeSubs.length} subscribers`}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {subs.map((s) => (
          <div key={s.$id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div>
              <p className="text-sm text-zinc-100">{s.email}</p>
              <p className="text-xs text-zinc-500">{s.name || 'No name'} · {s.source}</p>
            </div>
            <span className={`rounded px-2 py-0.5 text-xs ${s.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-zinc-800 text-zinc-500'}`}>
              {s.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
