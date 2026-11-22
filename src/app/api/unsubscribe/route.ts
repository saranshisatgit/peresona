import { NextResponse } from 'next/server'

import { verifyUnsubscribeToken } from '@/lib/reader-session'
import { getEmailHash } from '@/lib/subscriber-crypto'
import { sanityWriteClient } from '@/sanity/lib/client'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const token = typeof body?.token === 'string' ? body.token : null

    const email = verifyUnsubscribeToken(token)
    if (!email) {
      return NextResponse.json(
        { error: 'This unsubscribe link is invalid or has expired.' },
        { status: 400 },
      )
    }

    const subscriber = await sanityWriteClient
      .fetch<any>(`*[_type == "subscriber" && emailHash == $emailHash][0]`, {
        emailHash: getEmailHash(email),
      })
      .catch(() => null)

    // Only flip active subscribers — blocked (spam) stays blocked, and
    // missing docs get the same answer so the link reveals nothing.
    if (subscriber && subscriber.status === 'active') {
      await sanityWriteClient
        .patch(subscriber._id)
        .set({ status: 'inactive' })
        .commit()
    }

    return NextResponse.json({
      message: 'You have been unsubscribed and will receive no more emails.',
    })
  } catch (err) {
    console.error('[unsubscribe] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again shortly.' },
      { status: 500 },
    )
  }
}
