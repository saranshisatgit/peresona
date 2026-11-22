'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          action?: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string
      remove: (id: string) => void
    }
  }
}

/**
 * Invisible-until-needed Cloudflare Turnstile widget. Renders nothing
 * when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset (e.g. local dev), in
 * which case forms submit without a token and the server degrades open.
 */
export function TurnstileWidget({
  onToken,
}: {
  onToken: (token: string | null) => void
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!siteKey || !containerRef.current) return

    let cancelled = false

    const tryRender = (attempt: number) => {
      if (cancelled) return
      if (window.turnstile) {
        widgetId.current = window.turnstile.render(containerRef.current!, {
          sitekey: siteKey,
          action: 'turnstile-spin-v1',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      } else if (attempt < 100) {
        setTimeout(() => tryRender(attempt + 1), 100)
      }
    }
    tryRender(0)

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          // already removed (HMR)
        }
      }
    }
  }, [siteKey])

  if (!siteKey) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div ref={containerRef} className="mt-3" />
    </>
  )
}
