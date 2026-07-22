import { type Metadata } from 'next'

import { Providers } from '@/app/providers'

import '@/styles/tailwind.css'

export const metadata: Metadata = {
  title: {
    template: '%s - Saransh Sharma',
    default:
      'Saransh Sharma -  amateur',
  },
  description:
    'I\'m Saransh, a  designer and entrepreneur based in here and there. I\'m the founder and CEO of JYT, where we develop technologies that empower regular people to explore space on their own terms.',
  alternates: {
    types: {
      'application/rss+xml': `${process.env.NEXT_PUBLIC_SITE_URL}/feed.xml`,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-screen bg-zinc-50 dark:bg-black">
        <Providers>
          <div className="flex w-full flex-1">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
