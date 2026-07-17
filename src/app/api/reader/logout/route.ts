import { NextResponse } from 'next/server'

import { READER_COOKIE } from '@/lib/reader-session'

export async function POST() {
  const response = NextResponse.json({ message: 'Signed out' })
  response.cookies.delete(READER_COOKIE)
  return response
}
