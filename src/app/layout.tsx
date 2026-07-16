import { type Metadata } from 'next'

import { Providers } from '@/app/providers'

import '@/styles/tailwind.css'

export const metadata: Metadata = {
  title: {
    template: '%s - Saransh Sharma',
    default:
      'Saransh Sharma - Software designer, founder, and amateur astronaut',
  },
  description:
    'I\'m Saransh, a software designer and entrepreneur based in New York City. I\'m the founder and CEO of Planetaria, where we develop technologies that empower regular people to explore space on their own terms.',
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
