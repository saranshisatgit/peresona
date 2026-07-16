'use client'

import { useEffect, useState } from 'react'

interface ContentItem {
  $id: string
  key: string
  value: string
}

export default function ContentEditor() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/admin/data?col=site_content')
      .then((r) => r.json())
      .then((data) => {
        setItems(data.documents || [])
      })
  }, [])

  async function save(id: string, key: string) {
    setSaving(id)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/data`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ col: 'site_content', id, data: { value: edited[id] ?? items.find(i => i.$id === id)?.value } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setItems((prev) => prev.map((i) => (i.$id === id ? { ...i, value: edited[id] ?? i.value } : i)))
      setMessage(`Saved: ${key}`)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setSaving(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Site Content</h1>
        {message && <span className="text-sm text-teal-400">{message}</span>}
      </div>
      <p className="mt-1 text-sm text-zinc-400">Edit text shown on every page.</p>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <div key={item.$id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <label className="mb-1 block text-xs font-medium text-zinc-500">{item.key}</label>
            <div className="flex gap-2">
              <input
                defaultValue={item.value}
                onChange={(e) => setEdited((p) => ({ ...p, [item.$id]: e.target.value }))}
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
              />
              <button
                onClick={() => save(item.$id, item.key)}
                disabled={saving === item.$id}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500 disabled:opacity-50"
              >
                {saving === item.$id ? '...' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
