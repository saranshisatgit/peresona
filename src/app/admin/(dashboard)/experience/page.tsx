'use client'

import { useEffect, useState } from 'react'
import { GenericTable } from '../GenericTable'

export default function ExperienceAdmin() {
  const [items, setItems] = useState<any[]>([])
  const refresh = () => fetch('/api/admin/data?col=experience').then(r => r.json()).then(d => setItems(d.documents || []))
  useEffect(() => { refresh() }, [])
  return <GenericTable title="Experience" col="experience" items={items} fields={['company', 'title', 'logo', 'start', 'end', 'sort_order']} onRefresh={refresh} />
}
