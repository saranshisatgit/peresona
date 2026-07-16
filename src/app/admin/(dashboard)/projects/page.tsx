'use client'

import { useEffect, useState } from 'react'
import { GenericTable } from '../GenericTable'

export default function ProjectsAdmin() {
  const [items, setItems] = useState<any[]>([])
  const refresh = () => fetch('/api/admin/data?col=projects').then(r => r.ok ? r.json() : { documents: [] }).then(d => setItems(d.documents || []))
  useEffect(() => { refresh() }, [])
  return <GenericTable title="Projects" col="projects" items={items} fields={['name', 'description', 'url', 'label', 'logo', 'sort_order']} onRefresh={refresh} />
}
