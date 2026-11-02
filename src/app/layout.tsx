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
      <head>
        {/* Pre-hydration theme init: applies the saved/system theme class to
            <html> before the page paints, avoiding a flash of the wrong theme.
            Kept in sync with src/components/theme.tsx (storage key "theme"). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=window.localStorage.getItem('theme');var t=s==='light'||s==='dark'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}})();`,
          }}
        />
      </head>
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
