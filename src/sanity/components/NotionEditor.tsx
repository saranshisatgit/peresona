'use client'

import { useEffect, useRef, useState } from 'react'
import { type StringInputProps, set, unset, useClient } from 'sanity'
import { useCreateBlockNote, useEditorChange } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { Block } from '@blocknote/core'
import { parseBlocks } from '@/lib/parse-blocks'

import '@blocknote/mantine/style.css'

/**
 * Notion-style block editor used as a custom input for the `page` document.
 * Content is stored as a JSON string of BlockNote blocks (lossless).
 */
export function NotionEditor(props: StringInputProps) {
  const { value, onChange } = props
  const client = useClient({ apiVersion: '2024-01-01' })

  const lastPushed = useRef<string | null>(value ?? null)
  const [initialBlocks] = useState<Block[]>(() => parseBlocks(value))

  const editor = useCreateBlockNote({
    // BlockNote throws if initialContent is an empty array — pass undefined
    // so it falls back to its default empty document.
    initialContent: initialBlocks.length > 0 ? initialBlocks : undefined,
    uploadFile: async (file: File) => {
      const kind = file.type.startsWith('image/') ? 'image' : 'file'
      const asset = await client.assets.upload(kind, file, {
        filename: file.name || undefined,
      })
      return asset.url ?? ''
    },
  })

  // Push edits back to the Sanity form
  useEditorChange((e) => {
    const next = JSON.stringify(e.document)
    if (next !== lastPushed.current) {
      lastPushed.current = next
      onChange(set(next))
    }
  }, editor)

  // Handle external value changes (e.g. Sanity undo/restore/revert)
  useEffect(() => {
    const normalized = value ?? null
    if (normalized === lastPushed.current) return
    lastPushed.current = normalized
    if (normalized == null || normalized === '') {
      // A document must keep at least one block — replace with an empty paragraph.
      void editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: '' }])
      onChange(unset())
    } else {
      void editor.replaceBlocks(editor.document, parseBlocks(normalized))
    }
  }, [value, editor, onChange])

  return (
    <div
      style={{
        paddingTop: 4,
        paddingBottom: 8,
        border: '1px solid var(--card-border-color, #e3e3e3)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--card-bg-color, #ffffff)',
      }}
    >
      <BlockNoteView editor={editor} theme="light" />
    </div>
  )
}