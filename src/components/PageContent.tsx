'use client'

import { useState } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { Block } from '@blocknote/core'

import { useTheme } from '@/components/theme'
import { parseBlocks } from '@/lib/parse-blocks'

import '@blocknote/mantine/style.css'

/**
 * Renders a shared page's Notion-style content with a read-only BlockNote
 * editor. Rendered on the client so the server/Lambda never needs a DOM
 * (jsdom) — BlockNoteView is the same UI used by the Studio editor, so the
 * public page looks exactly like what you wrote.
 */
export function PageContent({
  content,
}: {
  content: string | null | undefined
}) {
  let { resolvedTheme } = useTheme()
  const [initialBlocks] = useState<Block[]>(() => parseBlocks(content))

  const editor = useCreateBlockNote({
    initialContent: initialBlocks.length > 0 ? initialBlocks : undefined,
  })

  return (
    <div className="notion-page-content">
      <BlockNoteView editor={editor} editable={false} theme={resolvedTheme} />
    </div>
  )
}