import { Layout } from '@/components/Layout'
import { getSiteContent } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent()
  return <Layout avatarUrl={content.global_avatar}>{children}</Layout>
}
