'use client'

import { useEffect, useRef } from 'react'
import { type StringInputProps, set, unset, useClient } from 'sanity'
import { useCreateBlockNote, useEditorChange } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { BlockNoteEditor, Block, PartialBlock } from '@blocknote/core'

import '@blocknote/mantine/style.css'

const EMPTY_DOC: PartialBlock[] = [{ type: 'paragraph', content: '' }]

/**
 * Modern (Notion-style) block editor for article/blog content.
 *
 * Stores BlockNote's internal HTML in the existing `content` text field, so:
 * - the reading page stays fully server-rendered (no client JS needed),
 * - legacy articles (plain HTML) keep rendering exactly as before, and are
 *   transparently upgraded to the block format the first time they're edited.
 */
export function ArticleEditor(props: StringInputProps) {
  const { value, onChange } = props
  const client = useClient({ apiVersion: '2024-01-01' })

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const lastPushed = useRef<string | null>(value ?? null)
  const skipNextPush = useRef(false)
  const dirty = useRef(false)
  const serializing = useRef(false)

  const editor = useCreateBlockNote({
    uploadFile: async (file: File) => {
      const kind = file.type.startsWith('image/') ? 'image' : 'file'
      const asset = await client.assets.upload(kind, file, {
        filename: file.name || undefined,
      })
      return asset.url ?? ''
    },
  })

  // Serialize the document to BlockNote HTML and push it to the form.
  // Coalesces bursts of edits while an async serialization is in flight.
  const serialize = async (e: BlockNoteEditor) => {
    if (serializing.current) return
    serializing.current = true
    try {
      do {
        dirty.current = false
        const html = await e.blocksToFullHTML(e.document)
        lastPushed.current = html
        onChangeRef.current(set(html))
      } while (dirty.current)
    } catch (error) {
      console.error('Failed to serialize article content', error)
    } finally {
      serializing.current = false
    }
  }

  useEditorChange((e) => {
    if (skipNextPush.current) return
    dirty.current = true
    void serialize(e)
  }, editor)

  // Load the stored value (legacy HTML or BlockNote HTML) into the editor on
  // mount, without pushing it back to the form.
  useEffect(() => {
    const initial = value ?? null
    if (!initial) return
    skipNextPush.current = true
    void (async () => {
      let blocks: Block[] = []
      try {
        blocks = await editor.tryParseHTMLToBlocks(initial)
      } catch {
        // unparseable — leave empty
      }
      await editor.replaceBlocks(editor.document, blocks.length ? blocks : EMPTY_DOC)
      skipNextPush.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  // Handle external value changes (e.g. Sanity undo/restore/revert).
  useEffect(() => {
    const normalized = value ?? null
    if (normalized === lastPushed.current) return
    lastPushed.current = normalized
    skipNextPush.current = true
    void (async () => {
      let blocks: Block[] = []
      if (normalized) {
        try {
          blocks = await editor.tryParseHTMLToBlocks(normalized)
        } catch {
          // keep empty
        }
      }
      await editor.replaceBlocks(editor.document, blocks.length ? blocks : EMPTY_DOC)
      skipNextPush.current = false
      if (!normalized) onChangeRef.current(unset())
    })()
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