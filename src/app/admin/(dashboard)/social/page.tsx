'use client'

import { useEffect, useState } from 'react'
import { GenericTable } from '../GenericTable'

export default function SocialAdmin() {
  const [items, setItems] = useState<any[]>([])
  const refresh = () => fetch('/api/admin/data?col=social_links').then(r => r.json()).then(d => setItems(d.documents || []))
  useEffect(() => { refresh() }, [])
  return <GenericTable title="Social Links" col="social_links" items={items} fields={['platform', 'url', 'label', 'sort_order']} onRefresh={refresh} />
}
