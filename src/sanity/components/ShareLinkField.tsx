'use client'

import { useCallback, useState } from 'react'
import { useFormValue, type FieldProps } from 'sanity'
import { Button, Card, Code, Flex, Stack, Text } from '@sanity/ui'

function getSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '')
  if (
    fromEnv &&
    !fromEnv.includes('localhost') &&
    !fromEnv.includes('127.0.0.1')
  ) {
    return fromEnv
  }
  // Local development: use the actual origin the studio is served from.
  return typeof window !== 'undefined' ? window.location.origin : fromEnv
}

/**
 * Renders the public share URL for a page with a copy button.
 * Used as a custom field on the `page` document (read-only, no stored value).
 */
export function ShareLinkField(_props: FieldProps) {
  const slug = (useFormValue(['slug', 'current']) as string | undefined) ?? ''
  const published =
    (useFormValue(['published']) as boolean | undefined) ?? false
  const [copied, setCopied] = useState(false)

  const url = slug ? `${getSiteUrl()}/p/${slug}` : ''

  const copy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for environments without the async clipboard API.
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }, [url])

  return (
    <Card padding={3} radius={2} tone={published ? 'positive' : 'default'} border>
      <Stack space={3}>
        <Text size={1} weight="semibold">
          {published
            ? 'This page is live — share the link with anyone'
            : 'Enable "Share with a link" above to make this page public'}
        </Text>
        {url ? (
          <Flex align="center" gap={2}>
            <Code
              size={1}
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {url}
            </Code>
            <Button
              mode="ghost"
              tone={copied ? 'positive' : 'primary'}
              text={copied ? 'Copied!' : 'Copy link'}
              onClick={copy}
            />
          </Flex>
        ) : (
          <Text size={1} muted>
            The link appears here once this page has a slug.
          </Text>
        )}
      </Stack>
    </Card>
  )
}