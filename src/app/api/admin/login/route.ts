export async function POST(request: Request) {
  const { email, password } = await request.json()

  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID

  const res = await fetch(`${endpoint}/account/sessions/email`, {
    method: 'POST',
    headers: {
      'X-Appwrite-Project': projectId!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok) {
    return Response.json(data, { status: res.status })
  }

  const response = Response.json(data, { status: 200 })

  const setCookieHeaders = res.headers.getSetCookie?.() ?? []

  if (setCookieHeaders.length > 0) {
    response.headers.set('Set-Cookie', setCookieHeaders.map((c: string) =>
      c.replace(/;\s*Domain\s*=\s*[^;]+/i, '')
        .replace(/;\s*Secure\s*/i, '')
    ).join(', '))
  }

  return response
}
