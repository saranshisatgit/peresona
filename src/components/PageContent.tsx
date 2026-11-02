'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/theme'

/**
 * Wraps server-rendered BlockNote HTML with the classes BlockNote's
 * stylesheet expects (.bn-root provides theme variables, .bn-editor scopes
 * table/code styles). The data-color-scheme attribute follows the site theme.
 */
export function PageContent({ html }: { html: string }) {
  let { resolvedTheme } = useTheme()
  let ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.setAttribute(
      'data-color-scheme',
      resolvedTheme === 'dark' ? 'dark' : 'light',
    )
  }, [resolvedTheme])

  if (!html) {
    return null
  }

  return (
    <div
      ref={ref}
      className="notion-page-content bn-container bn-root bn-default-styles bn-editor"
      data-color-scheme="light"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}