import { NextResponse } from 'next/server'
import { sanityWriteClient } from '@/sanity/lib/client'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()

    const subscriber = await sanityWriteClient.fetch<any>(
      `*[_type == "subscriber" && email == $email][0]`,
      { email: normalizedEmail },
    )

    if (!subscriber) {
      return NextResponse.json({ message: 'Email not found' }, { status: 404 })
    }

    await sanityWriteClient.patch(subscriber._id).set({ status: 'inactive' }).commit()

    return NextResponse.json({ message: 'Unsubscribed successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
