import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  if (!projectId) return false

  const sessionCookie = cookieStore.get(`a_session_${projectId}`)
  if (!sessionCookie) return false

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/account`,
      {
        headers: {
          'X-Appwrite-Project': projectId,
          'Content-Type': 'application/json',
          Cookie: `a_session_${projectId}=${sessionCookie.value}`,
        },
      }
    )
    return res.ok
  } catch {
    return false
  }
}

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: '◉' },
  { href: '/admin/content', label: 'Site Content', icon: '✎' },
  { href: '/admin/articles', label: 'Articles', icon: '📄' },
  { href: '/admin/subscribers', label: 'Subscribers', icon: '✉' },
  { href: '/admin/projects', label: 'Projects', icon: '▣' },
  { href: '/admin/experience', label: 'Experience', icon: '💼' },
  { href: '/admin/social', label: 'Social Links', icon: '🔗' },
]

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const isAuth = await checkAuth()

  if (!isAuth) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-900 p-4">
        <div className="mb-6">
          <Link href="/admin" className="text-lg font-bold text-teal-400">
            Admin Panel
          </Link>
          <p className="text-xs text-zinc-500">saranshsharma.me</p>
        </div>
        <nav className="flex flex-col gap-1">
          {sidebarLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              <span className="w-5 text-center">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 pt-4 border-t border-zinc-800">
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-zinc-800 hover:text-red-300">
              ← Logout
            </button>
          </form>
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300">
            ← View Site
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
