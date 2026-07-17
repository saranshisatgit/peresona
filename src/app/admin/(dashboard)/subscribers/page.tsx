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
  const [showAdd, setShowAdd] = useState(false)
  const [newSub, setNewSub] = useState({ email: '', name: '', source: 'admin' })
  const [adding, setAdding] = useState(false)

  async function loadSubs() {
    const d = await fetch('/api/admin/data?col=subscribers').then((r) =>
      r.ok ? r.json() : { documents: [] },
    )
    setSubs(d.documents || [])
  }

  useEffect(() => {
    fetch('/api/admin/data?col=subscribers')
      .then((r) => r.ok ? r.json() : { documents: [] })
      .then((d) => setSubs(d.documents || []))
    fetch('/api/admin/data?col=articles')
      .then((r) => r.ok ? r.json() : { documents: [] })
      .then((d) => setArticles((d.documents || []).filter((a: any) => a.published)))
  }, [])

  async function addSubscriber() {
    setAdding(true)
    setMessage('')
    try {
      const email = newSub.email.trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email address')
      }
      const res = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          col: 'subscribers',
          data: {
            email,
            name: newSub.name.trim(),
            status: 'active',
            source: newSub.source || 'admin',
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.message?.includes('already exists')) {
          throw new Error('That email is already subscribed')
        }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setNewSub({ email: '', name: '', source: 'admin' })
      setShowAdd(false)
      setMessage('Subscriber added')
      loadSubs()
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setAdding(false)
  }

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
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">
            {showAdd ? 'Cancel' : '+ Add'}
          </button>
          <button onClick={() => setShowSend(!showSend)} className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500">
            {showSend ? 'Cancel' : 'Send Email'}
          </button>
        </div>
      </div>

      {message && <div className="mt-3 text-sm text-teal-400">{message}</div>}

      {showAdd && (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Add Subscriber Manually</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500">Email</label>
              <input
                type="email"
                value={newSub.email}
                onChange={(e) => setNewSub((p) => ({ ...p, email: e.target.value }))}
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
                placeholder="name@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500">Name (optional)</label>
                <input
                  value={newSub.name}
                  onChange={(e) => setNewSub((p) => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500">Source</label>
                <select
                  value={newSub.source}
                  onChange={(e) => setNewSub((p) => ({ ...p, source: e.target.value }))}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
                >
                  <option value="admin">admin</option>
                  <option value="website">website</option>
                  <option value="import">import</option>
                </select>
              </div>
            </div>
            <button
              onClick={addSubscriber}
              disabled={adding || !newSub.email}
              className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add subscriber'}
            </button>
          </div>
        </div>
      )}

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
