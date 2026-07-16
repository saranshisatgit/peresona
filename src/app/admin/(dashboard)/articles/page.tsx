'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface Article {
  $id: string
  slug: string
  title: string
  description: string
  content: string
  published: boolean
  date: string
  author: string
}

interface Subscriber {
  $id: string
  email: string
  name: string
  status: string
}

export default function ArticlesManager() {
  const [articles, setArticles] = useState<Article[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ slug: '', title: '', description: '', content: '', author: '', date: '', published: true })
  const [message, setMessage] = useState('')
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [notify, setNotify] = useState(false)
  const [selectedSubs, setSelectedSubs] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showHtml, setShowHtml] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [ar, sr] = await Promise.all([
      fetch('/api/admin/data?col=articles').then(r => r.json()),
      fetch('/api/admin/data?col=subscribers').then(r => r.json()),
    ])
    setArticles((ar.documents || []).sort((a: Article, z: Article) => (a.date < z.date ? 1 : -1)))
    setSubs((sr.documents || []).filter((s: Subscriber) => s.status === 'active'))
  }

  function newArticle() {
    setEditId('new')
    setNotify(false)
    setSelectedSubs([])
    setForm({ slug: '', title: '', description: '', content: '<p></p>', author: '', date: new Date().toISOString().substring(0, 10), published: true })
  }

  function edit(a: Article) {
    setEditId(a.$id)
    setNotify(false)
    setSelectedSubs([])
    setForm({ slug: a.slug, title: a.title, description: a.description, content: a.content || '<p></p>', author: a.author, date: a.date, published: a.published })
  }

  function wrapTag(open: string, close: string) {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const text = form.content
    const selected = text.substring(start, end)
    const replacement = open + selected + close
    setForm(p => ({ ...p, content: text.substring(0, start) + replacement + text.substring(end) }))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + open.length, start + open.length + selected.length) }, 0)
  }

  function insertLink() {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const text = form.content
    const selected = text.substring(start, end) || 'link text'
    const url = prompt('Link URL:', 'https://')
    if (!url) return
    const replacement = `<a href="${url}">${selected}</a>`
    setForm(p => ({ ...p, content: text.substring(0, start) + replacement + text.substring(end) }))
  }

  async function save() {
    setMessage('')
    setSending(true)
    try {
      if (editId === 'new') {
        await fetch('/api/admin/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ col: 'articles', data: form }) })
      } else {
        await fetch('/api/admin/data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ col: 'articles', id: editId, data: form }) })
      }

      if (notify && form.published) {
        const targets = selectedSubs.length > 0 ? selectedSubs : '__all__'
        await fetch('/api/admin/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: form.title,
            articleSlug: form.slug,
            targets,
          }),
        }).catch(() => {})
      }

      setEditId(null)
      setMessage('Saved!' + (notify ? ' Newsletter sent.' : ''))
      load()
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setSending(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this article?')) return
    await fetch('/api/admin/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ col: 'articles', id }) })
    load()
  }

  function slugify(v: string) {
    return v.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 100)
  }

  function toggleSub(id: string) {
    setSelectedSubs(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const editMode = editId !== null

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Articles</h1>
          {message && <span className="ml-4 text-sm text-teal-400">{message}</span>}
        </div>
        {!editMode && (
          <button onClick={newArticle} className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500">+ New</button>
        )}
      </div>

      {editMode && (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-300">{editId === 'new' ? 'New Article' : 'Edit Article'}</h2>
            <div className="flex gap-2">
              <button onClick={save} disabled={sending} className="rounded bg-teal-600 px-4 py-1.5 text-sm text-white hover:bg-teal-500 disabled:opacity-50">
                {sending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditId(null)} className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Title</label>
                <input value={form.title} onChange={(e) => { const t = e.target.value; setForm(p => ({ ...p, title: t, slug: editId === 'new' ? slugify(t) : p.slug })) }}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Slug</label>
                <input value={form.slug} onChange={(e) => setForm(p => ({ ...p, slug: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Author</label>
                <input value={form.author} onChange={(e) => setForm(p => ({ ...p, author: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-zinc-500">Content</label>
                <div className="flex gap-1">
                  <button onClick={() => wrapTag('<strong>', '</strong>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold">B</button>
                  <button onClick={() => wrapTag('<em>', '</em>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 italic">I</button>
                  <button onClick={() => wrapTag('<h2>', '</h2>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">H2</button>
                  <button onClick={() => wrapTag('<h3>', '</h3>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">H3</button>
                  <button onClick={() => wrapTag('<ul>\n<li>', '</li>\n</ul>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">UL</button>
                  <button onClick={() => wrapTag('<ol>\n<li>', '</li>\n</ol>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">OL</button>
                  <button onClick={insertLink} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">🔗</button>
                  <button onClick={() => wrapTag('<blockquote>', '</blockquote>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700">"</button>
                  <button onClick={() => wrapTag('<code>', '</code>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono">&lt;/&gt;</button>
                  <button onClick={() => wrapTag('<pre><code>', '</code></pre>')} className="rounded px-2 py-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono">PRE</button>
                  <button onClick={() => setShowHtml(!showHtml)} className={`rounded px-2 py-1 text-xs ${showHtml ? 'bg-teal-700 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                    {showHtml ? 'HTML' : 'Preview'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4" style={showHtml ? {} : {}}>
                {showHtml ? (
                  <textarea ref={textareaRef} value={form.content} onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))} rows={16}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 focus:border-teal-500 focus:outline-none resize-y" />
                ) : null}
              </div>
              {!showHtml && (
                <div className="rounded border border-zinc-700 bg-white p-6 min-h-[300px] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: form.content }} />
              )}
            </div>

            <div className="flex items-center gap-6 pt-2 border-t border-zinc-800">
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm(p => ({ ...p, published: e.target.checked }))}
                  className="rounded border-zinc-600" />
                Published
              </label>

              {form.published && (
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)}
                    className="rounded border-zinc-600" />
                  Notify subscribers ({subs.length} active)
                </label>
              )}
            </div>

            {notify && form.published && (
              <div className="rounded border border-zinc-700 bg-zinc-800/50 p-3">
                <label className="flex items-center gap-2 text-sm text-zinc-300 mb-2">
                  <input type="checkbox" checked={selectedSubs.length === 0} onChange={() => setSelectedSubs([])}
                    className="rounded border-zinc-600" />
                  All active subscribers
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1 pl-5">
                  {subs.map(s => (
                    <label key={s.$id} className={`flex items-center gap-2 text-xs cursor-pointer ${selectedSubs.length === 0 ? 'opacity-40 pointer-events-none' : 'text-zinc-400'}`}>
                      <input type="checkbox" checked={selectedSubs.includes(s.$id)} onChange={() => toggleSub(s.$id)}
                        disabled={selectedSubs.length === 0}
                        className="rounded border-zinc-600" />
                      {s.email} <span className="text-zinc-600">{s.name || ''}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {articles.map((a) => (
          <div key={a.$id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="min-w-0 flex-1">
              <Link href={`/articles/${a.slug}`} className="text-sm font-medium text-zinc-100 hover:text-teal-400">{a.title}</Link>
              <p className="truncate text-xs text-zinc-500">{a.date} {!a.published && <span className="text-yellow-500">(draft)</span>}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => edit(a)} className="text-xs text-zinc-400 hover:text-zinc-200">Edit</button>
              <button onClick={() => remove(a.$id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
