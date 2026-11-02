export function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * Formats a full ISO datetime string (e.g. Sanity's `_updatedAt`).
 * Unlike `formatDate` (which expects a date-only string), this parses the
 * timestamp directly and returns '' instead of "Invalid Date" on bad input.
 */
export function formatDateTime(dateTimeString: string) {
  const date = new Date(dateTimeString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}