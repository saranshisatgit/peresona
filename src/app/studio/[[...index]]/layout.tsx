import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Studio - Saransh Sharma',
  robots: { index: false, follow: false },
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-screen">{children}</div>
}
