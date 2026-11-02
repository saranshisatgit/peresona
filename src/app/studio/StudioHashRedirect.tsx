'use client'

import { useEffect } from 'react'

/**
 * Sanity Studio (via next-sanity) uses hash-based routing: the structure tool
 * lives at `/studio#/structure`. The login flow only preserves pathname +
 * search in its `origin` param, so after logging in the hash is empty and the
 * studio lands on its root route. This makes sure the studio always opens on
 * `/structure` — both before login (so the post-login return URL is correct)
 * and right after login.
 */
export function StudioHashRedirect() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash === '#' || hash === '#/') {
      // Setting location.hash fires a hashchange event, which the studio's
      // history listener picks up and navigates to the structure tool.
      window.location.hash = '#/structure'
    }
  }, [])

  return null
}