import { sanityWriteClient } from '@/sanity/lib/client'

/**
 * Best-effort subscriber upsert. Returns true when the subscriber
 * exists and is active afterwards, false when Sanity rejected the
 * write (e.g. the API token lacks "create" permissions). Write
 * failures are logged but never thrown — a verified reader should
 * still be able to read (see getVerifiedReaderEmail).
 */
export async function upsertSubscriber(
  email: string,
): Promise<{ active: boolean; writeFailed: boolean }> {
  try {
    const existing = await sanityWriteClient.fetch<any>(
      `*[_type == "subscriber" && email == $email][0]`,
      { email },
    )

    if (!existing) {
      await sanityWriteClient.create({
        _type: 'subscriber',
        email,
        name: '',
        status: 'active',
        source: 'website',
      })
      return { active: true, writeFailed: false }
    }

    if (existing.status !== 'active') {
      await sanityWriteClient
        .patch(existing._id)
        .set({ status: 'active' })
        .commit()
    }
    return { active: true, writeFailed: false }
  } catch (err) {
    console.warn('[subscribe] Could not write subscriber to Sanity:', err)
    return { active: true, writeFailed: true }
  }
}
