import type { Block } from '@blocknote/core'

/**
 * Parse the JSON string stored in Sanity into BlockNote blocks.
 * Never throws — falls back to an empty document.
 *
 * Kept in its own module (type-only BlockNote import) so it can be used by
 * both the Sanity Studio editor (client) and the public page (server).
 */
export function parseBlocks(value: string | null | undefined): Block[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed as Block[]) : []
  } catch {
    return []
  }
}