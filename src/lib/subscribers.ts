import { sanityWriteClient } from '@/sanity/lib/client'

import {
  getEmailHash,
  getMailboxKeyHash,
  encryptEmail,
  decryptEmail,
  maskEmail,
} from '@/lib/subscriber-crypto'

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
 * Best-effort subscriber upsert, keyed by the HMAC of the email (see
 * subscriber-crypto — addresses are never stored in plaintext).
 * Returns active: false only when the subscriber is explicitly blocked.
 * Write failures are logged but never thrown — a verified reader
 * should still be able to read (see getVerifiedReaderEmail).
 */
export async function upsertSubscriber(
  email: string,
  opts: UpsertOptions = {},
): Promise<{ active: boolean; writeFailed: boolean; id: string | null }> {
  const emailHash = getEmailHash(email)
  try {
    const existing = await sanityWriteClient.fetch<any>(
      `*[_type == "subscriber" && emailHash == $emailHash][0]`,
      { emailHash },
    )

    if (!existing) {
      const created = await sanityWriteClient.create({
        _type: 'subscriber',
        emailHash,
        emailEnc: encryptEmail(email),
        emailMasked: maskEmail(email),
        name: '',
        status: 'active',
        source: 'website',
        ...(opts.mailboxKey
          ? { mailboxKeyHash: getMailboxKeyHash(opts.mailboxKey) }
          : {}),
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
    if (opts.mailboxKey && !existing.mailboxKeyHash) {
      patch.mailboxKeyHash = getMailboxKeyHash(opts.mailboxKey)
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

/**
 * Decrypt the stored address of a subscriber document (for admin
 * scripts and exports). Requires the same READER_COOKIE_SECRET that
 * sealed it.
 */
export async function getSubscriberEmail(
  id: string,
): Promise<string | null> {
  try {
    const doc = await sanityWriteClient.fetch<any>(
      `*[_type == "subscriber" && _id == $id][0]{ emailEnc }`,
      { id },
    )
    return doc?.emailEnc ? decryptEmail(doc.emailEnc) : null
  } catch {
    return null
  }
}
