import type { Metadata } from 'next'

import { StudioHashRedirect } from '../StudioHashRedirect'

export const metadata: Metadata = {
  title: 'Studio - Saransh Sharma',
  robots: { index: false, follow: false },
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen">
      <StudioHashRedirect />
      {children}
    </div>
  )
}