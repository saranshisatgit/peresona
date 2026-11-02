'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/theme'

/**
 * Wraps BlockNote HTML (stored by the article editor) with the classes and
 * color-scheme attribute BlockNote's stylesheet expects. Pure static HTML —
 * server-rendered, no editor involved.
 */
export function BlockNoteHtml({ html }: { html: string }) {
  let { resolvedTheme } = useTheme()
  let ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.setAttribute(
      'data-color-scheme',
      resolvedTheme === 'dark' ? 'dark' : 'light',
    )
  }, [resolvedTheme])

  return (
    <div
      ref={ref}
      className="notion-page-content bn-container bn-root bn-default-styles bn-editor"
      data-color-scheme="light"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}