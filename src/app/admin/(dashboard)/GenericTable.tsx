'use client'

import { useState } from 'react'

interface Props {
  title: string
  col: string
  items: any[]
  fields: string[]
  onRefresh: () => void
}

export function GenericTable({ title, col, items, fields, onRefresh }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [message, setMessage] = useState('')

  async function save() {
    setMessage('')
    try {
      if (editId === 'new') {
        await fetch('/api/admin/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ col, data: form }) })
      } else {
        await fetch('/api/admin/data', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ col, id: editId, data: form }) })
      }
      setEditId(null)
      setMessage('Saved!')
      onRefresh()
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
  }

  async function remove(id: string) {
    if (!confirm(`Delete this ${title.slice(0, -1)}?`)) return
    await fetch('/api/admin/data', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ col, id }) })
    onRefresh()
  }

  function startNew() {
    const init: Record<string, any> = {}
    fields.forEach((f) => { init[f] = '' })
    init.sort_order = items.length + 1
    setEditId('new')
    setForm(init)
  }

  function startEdit(item: any) {
    const init: Record<string, any> = {}
    fields.forEach((f) => { init[f] = item[f] ?? '' })
    setEditId(item.$id)
    setForm(init)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {message && <span className="ml-4 text-sm text-teal-400">{message}</span>}
        </div>
        <button onClick={startNew} className="rounded-lg bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500">+ New</button>
      </div>

      {editId && (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">{editId === 'new' ? `New ${title.slice(0, -1)}` : 'Edit'}</h2>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f} className={['description', 'url', 'label'].includes(f) ? 'col-span-2' : ''}>
                <label className="block text-xs text-zinc-500">{f.replace('_', ' ')}</label>
                {f === 'description' ? (
                  <textarea value={form[f] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} rows={3} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
                ) : (
                  <input value={form[f] ?? ''} type={f === 'sort_order' ? 'number' : 'text'} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="rounded bg-teal-600 px-4 py-1.5 text-sm text-white hover:bg-teal-500">Save</button>
            <button onClick={() => setEditId(null)} className="text-sm text-zinc-500 hover:text-zinc-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-2">
        {items.map((item) => {
          const label = item.name || item.company || item.platform || item.title || item.$id
          return (
            <div key={item.$id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-100">{String(label).substring(0, 80)}</p>
                <p className="truncate text-xs text-zinc-500">
                  {fields.filter((f) => f !== 'sort_order').map((f) => item[f]).filter(Boolean).join(' · ').substring(0, 100)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(item)} className="text-xs text-zinc-400 hover:text-zinc-200">Edit</button>
                <button onClick={() => remove(item.$id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
