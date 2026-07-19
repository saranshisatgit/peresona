 'use client'

 import { useEffect, useState, useRef } from 'react'
 import { contentSchema, getFieldsByPage, pageLabels, pageOrder } from '@/lib/content-schema'

 const HEIC_EXT_RE = /\.(heic|heif)$/i
 const HEIC_MIME_RE = /^image\/(heic|heif)$/i

 function isHeic(file: File): boolean {
   return HEIC_EXT_RE.test(file.name) || HEIC_MIME_RE.test(file.type)
 }

 async function maybeConvertHeic(file: File): Promise<File> {
   if (!isHeic(file)) return file
   const heic2any = (await import('heic2any')).default
   const converted = (await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })) as Blob | Blob[]
   const blob = Array.isArray(converted) ? converted[0] : converted
   const newName = file.name.replace(HEIC_EXT_RE, '.jpg')
   return new File([blob], newName, { type: 'image/jpeg' })
 }

 interface ContentDoc {
  $id: string
  key: string
  value: string
}

export default function ContentEditor() {
  const [docs, setDocs] = useState<Record<string, ContentDoc>>({})
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/data?col=site_content')
      .then((r) => r.ok ? r.json() : { documents: [] })
      .then((data) => {
        const map: Record<string, ContentDoc> = {}
        for (const doc of data.documents || []) {
          map[doc.key] = doc
        }
        setDocs(map)
        setLoading(false)
      })
  }, [])

  async function ensureDoc(key: string): Promise<string | null> {
    if (docs[key]) return docs[key].$id
    const res = await fetch('/api/admin/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ col: 'site_content', data: { key, value: '' } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    setDocs((prev) => ({ ...prev, [key]: { $id: data.$id, key, value: '' } }))
    return data.$id
  }

  async function save(key: string) {
    setSaving(key)
    setMessage('')
    try {
      const id = await ensureDoc(key)
      if (!id) throw new Error('Failed to create content key')
      const res = await fetch('/api/admin/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ col: 'site_content', id, data: { value: edited[key] ?? docs[key]?.value ?? '' } }),
      })
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`)
      setDocs((prev) => ({ ...prev, [key]: { ...prev[key], value: edited[key] ?? prev[key]?.value ?? '' } }))
      setMessage(`Saved: ${key}`)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setSaving(null)
  }

   async function uploadImage(key: string, file: File) {
     setSaving(key)
     setMessage('')
     try {
       const uploadFile = await maybeConvertHeic(file)
       const formData = new FormData()
       formData.append('file', uploadFile)
       const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      const id = await ensureDoc(key)
      if (!id) throw new Error('Failed to create content key')
      const res = await fetch('/api/admin/data', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ col: 'site_content', id, data: { value: uploadData.url } }),
      })
      if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`)
      setDocs((prev) => ({ ...prev, [key]: { ...prev[key], value: uploadData.url } }))
      setEdited((prev) => ({ ...prev, [key]: uploadData.url }))
      setMessage(`Uploaded: ${key}`)
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    }
    setSaving(null)
  }

  function getCurrentValue(key: string): string {
    return edited[key] ?? docs[key]?.value ?? ''
  }

  const fieldsByPage = getFieldsByPage()

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Site Content</h1>
        <p className="mt-2 text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Content</h1>
          {message && <span className="ml-4 text-sm text-teal-400">{message}</span>}
        </div>
      </div>
      <p className="mt-1 text-sm text-zinc-400">Edit text and images shown across your site, organized by page.</p>

      <div className="mt-6 space-y-8">
        {pageOrder.map((pageKey) => {
          const fields = fieldsByPage[pageKey]
          if (!fields) return null

          return (
            <div key={pageKey} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
              <h2 className="mb-4 text-sm font-semibold text-teal-400">{pageLabels[pageKey]}</h2>
              <div className="space-y-4">
                {fields.map((field) => {
                  const value = getCurrentValue(field.key)
                  const isImage = field.type === 'image'
                  const doc = docs[field.key]

                  return (
                    <div key={field.key} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                      <label className="mb-2 block text-xs font-medium text-zinc-400">{field.label}</label>

                      {isImage ? (
                        <div className="space-y-3">
                          {value && (
                            <div className="relative h-28 w-full overflow-hidden rounded-md bg-zinc-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={value} alt={field.label} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2">
                             <input
                               ref={(el) => { fileRefs.current[field.key] = el }}
                               type="file"
                               accept="image/*,.heic,.heif"
                               onChange={(e) => {
                                 const file = e.target.files?.[0]
                                 if (file) uploadImage(field.key, file)
                               }}
                               className="hidden"
                             />
                            <button
                              onClick={() => fileRefs.current[field.key]?.click()}
                              disabled={saving === field.key}
                              className="rounded bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-500 disabled:opacity-50"
                            >
                              {saving === field.key ? 'Uploading...' : 'Upload'}
                            </button>
                            <input
                              value={value}
                              onChange={(e) => setEdited((p) => ({ ...p, [field.key]: e.target.value }))}
                              placeholder="Or paste image URL..."
                              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 focus:border-teal-500 focus:outline-none"
                            />
                            <button
                              onClick={() => save(field.key)}
                              disabled={saving === field.key}
                              className="rounded border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                            >
                              Save URL
                            </button>
                          </div>
                        </div>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          defaultValue={value}
                          onChange={(e) => setEdited((p) => ({ ...p, [field.key]: e.target.value }))}
                          rows={5}
                          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
                        />
                      ) : (
                        <input
                          defaultValue={value}
                          onChange={(e) => setEdited((p) => ({ ...p, [field.key]: e.target.value }))}
                          type={field.type === 'email' ? 'email' : 'text'}
                          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-teal-500 focus:outline-none"
                        />
                      )}

                      {!isImage && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => save(field.key)}
                            disabled={saving === field.key}
                            className="rounded bg-teal-600 px-4 py-1.5 text-xs text-white hover:bg-teal-500 disabled:opacity-50"
                          >
                            {saving === field.key ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}

                      {!doc && (
                        <p className="mt-1 text-xs text-zinc-600">Not yet set — using default</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
