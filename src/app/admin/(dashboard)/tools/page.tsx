'use client'

import { useEffect, useState } from 'react'
import { GenericTable } from '../GenericTable'

export default function ToolsAdmin() {
  const [items, setItems] = useState<any[]>([])
  const refresh = () => fetch('/api/admin/data?col=tools').then(r => r.ok ? r.json() : { documents: [] }).then(d => setItems(d.documents || []))
  useEffect(() => { refresh() }, [])
  return <GenericTable title="Tools" col="tools" items={items} fields={['section', 'title', 'description', 'url', 'sort_order']} onRefresh={refresh} />
}
