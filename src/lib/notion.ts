import { ServerBlockNoteEditor } from '@blocknote/server-util'
import { getDocument } from '@blocknote/server-util/dom'
import type { Block } from '@blocknote/core'

// One shared DOM per server process — matches BlockNote's guidance to keep
// the rendering environment alive and reuse it across exports.
let sharedDocument: Document | null = null

function getSharedDocument(): Document {
  if (!sharedDocument) {
    sharedDocument = getDocument()
  }
  return sharedDocument
}

/**
 * Server-side render BlockNote blocks to their internal HTML format.
 * The output is styled by `@blocknote/core/style.css` and must be wrapped in
 * a `.bn-root .bn-default-styles .bn-editor` element with a data-color-scheme.
 *
 * SERVER ONLY — imports jsdom, never import this module from client code.
 */
export async function blocksToNotionHtml(blocks: Block[]): Promise<string> {
  if (!blocks || blocks.length === 0) return ''
  try {
    const editor = ServerBlockNoteEditor.create({}, getSharedDocument())
    return await editor.blocksToFullHTML(blocks)
  } catch {
    return ''
  }
}