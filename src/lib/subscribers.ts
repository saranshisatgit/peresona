import { sanityWriteClient } from '@/sanity/lib/client'

export interface UpsertOptions {
  /** Canonical inbox identity (see subscribe-guard). */
  mailboxKey?: string
  /** HMAC of the signup IP, for per-IP rate limiting. */
  ipHash?: string
  /**
   * Set when the caller actually delivered a verification email — the
   * send is stamped onto the document so cooldowns and global Resend
   * budgets stay accurate.
   */
  recordEmailSend?: boolean
}

/**
 * Best-effort subscriber upsert. Returns active: false only when the
 * subscriber is explicitly blocked. Write failures are logged but never
 * thrown — a verified reader should still be able to read (see
 * getVerifiedReaderEmail).
 */
export async function upsertSubscriber(
  email: string,
  opts: UpsertOptions = {},
): Promise<{ active: boolean; writeFailed: boolean; id: string | null }> {
  try {
    const existing = await sanityWriteClient.fetch<any>(
      `*[_type == "subscriber" && email == $email][0]`,
      { email },
    )

    if (!existing) {
      const created = await sanityWriteClient.create({
        _type: 'subscriber',
        email,
        name: '',
        status: 'active',
        source: 'website',
        ...(opts.mailboxKey ? { mailboxKey: opts.mailboxKey } : {}),
        ...(opts.ipHash ? { signupIpHash: opts.ipHash } : {}),
        ...(opts.recordEmailSend
          ? {
              lastEmailSentAt: new Date().toISOString(),
              sentEmailCount: 1,
            }
          : {}),
      })
      return { active: true, writeFailed: false, id: created._id }
    }

    // A blocked subscriber is never reactivated from a public endpoint.
    if (existing.status === 'blocked') {
      return { active: false, writeFailed: false, id: existing._id }
    }

    const patch: Record<string, unknown> = {}
    if (existing.status !== 'active') patch.status = 'active'
    if (opts.mailboxKey && !existing.mailboxKey) {
      patch.mailboxKey = opts.mailboxKey
    }
    if (opts.ipHash && !existing.signupIpHash) {
      patch.signupIpHash = opts.ipHash
    }
    if (opts.recordEmailSend) {
      patch.lastEmailSentAt = new Date().toISOString()
    }
    if (Object.keys(patch).length > 0 || opts.recordEmailSend) {
      const mutation = sanityWriteClient
        .patch(existing._id)
        .setIfMissing({ sentEmailCount: 0 })
        .set(patch)
      if (opts.recordEmailSend) mutation.inc({ sentEmailCount: 1 })
      await mutation.commit()
    }
    return { active: true, writeFailed: false, id: existing._id }
  } catch (err) {
    console.warn('[subscribe] Could not write subscriber to Sanity:', err)
    return { active: true, writeFailed: true, id: null }
  }
}
