import * as cheerio from 'cheerio'

/**
 * Extracts the first few top-level blocks of an article's HTML so that
 * subscriber-only posts can show a real preview of the content instead of
 * just their one-line description. Works with both BlockNote HTML
 * (`.bn-block-group`) and legacy plain-HTML articles.
 *
 * Truncation happens on the server, so the full article body never reaches
 * a non-subscriber's browser.
 */
export function extractContentPreview(
  content: string | undefined,
  keep = 3,
): string {
  if (!content || keep <= 0) return ''

  const $ = cheerio.load(content)

  const group = $('.bn-block-group').first()
  if (group.length) {
    const blocks = group.children('.bn-block-outer')
    if (!blocks.length) return ''
    const kept = blocks.slice(0, keep)
    if (!kept.length) return ''
    const previewGroup = group.clone().empty()
    previewGroup.append($.html(kept))
    return $.html(previewGroup)
  }

  // Legacy plain HTML — take the first top-level elements.
  const tops = $('body').children().slice(0, keep)
  if (!tops.length) return ''
  return $.html(tops)
}
