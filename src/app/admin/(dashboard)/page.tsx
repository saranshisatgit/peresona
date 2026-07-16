async function getCounts() {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  const apiKey = process.env.APPWRITE_API_KEY
  const dbId = process.env.APPWRITE_DATABASE_ID

  const h = { 'X-Appwrite-Project': projectId!, 'X-Appwrite-Key': apiKey! }
  const fetchDocs = async (colId: string) => {
    if (!colId) return []
    const res = await fetch(`${endpoint}/databases/${dbId}/collections/${colId}/documents`, { headers: h })
    const data = await res.json()
    return data.documents || []
  }

  const [content, articles, subscribers, projects, experience] = await Promise.all([
    fetchDocs(process.env.APPWRITE_SITE_CONTENT_COLLECTION_ID!),
    fetchDocs(process.env.APPWRITE_ARTICLES_COLLECTION_ID!),
    fetchDocs(process.env.APPWRITE_SUBSCRIBERS_COLLECTION_ID!),
    fetchDocs(process.env.APPWRITE_PROJECTS_COLLECTION_ID!),
    fetchDocs(process.env.APPWRITE_EXPERIENCE_COLLECTION_ID!),
  ])

  return { content: content.length, articles: articles.length, subscribers: subscribers.length, projects: projects.length, experience: experience.length, activeSubs: subscribers.filter((s: any) => s.status === 'active').length }
}

export default async function AdminDashboard() {
  const counts = await getCounts()

  const cards = [
    { label: 'Articles', count: counts.articles, href: '/admin/articles' },
    { label: 'Active Subscribers', count: counts.activeSubs, href: '/admin/subscribers', sub: `${counts.subscribers} total` },
    { label: 'Content Keys', count: counts.content, href: '/admin/content' },
    { label: 'Projects', count: counts.projects, href: '/admin/projects' },
    { label: 'Experience', count: counts.experience, href: '/admin/experience' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-400">Overview of your site data stored in Appwrite.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700"
          >
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-zinc-100">{card.count}</p>
            {card.sub && <p className="mt-1 text-xs text-zinc-500">{card.sub}</p>}
          </a>
        ))}
      </div>
    </div>
  )
}
