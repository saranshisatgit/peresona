import { NextResponse } from 'next/server'

import {
  signReaderToken,
  READER_COOKIE,
  readerCookieOptions,
} from '@/lib/reader-session'
import { sanityWriteClient } from '@/sanity/lib/client'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const existing = await sanityWriteClient.fetch<any>(
      `*[_type == "subscriber" && email == $email][0]`,
      { email: normalizedEmail },
    )

    if (!existing) {
      await sanityWriteClient.create({
        _type: 'subscriber',
        email: normalizedEmail,
        name: '',
        status: 'active',
        source: 'website',
      })
    } else if (existing.status !== 'active') {
      await sanityWriteClient.patch(existing._id).set({ status: 'active' }).commit()
    }

    const response = NextResponse.json(
      { message: existing ? 'Already subscribed' : 'Subscribed successfully' },
      { status: existing ? 200 : 201 },
    )
    response.cookies.set(
      READER_COOKIE,
      signReaderToken(normalizedEmail),
      readerCookieOptions,
    )
    return response
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
