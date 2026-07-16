import { cookies } from 'next/headers'

export async function checkApiAuth(): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  if (!projectId) return false

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(`a_session_${projectId}`)
  if (!sessionCookie) return false

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/account`,
      {
        headers: {
          'X-Appwrite-Project': projectId,
          'Content-Type': 'application/json',
          Cookie: `a_session_${projectId}=${sessionCookie.value}`,
        },
      }
    )
    return res.ok
  } catch {
    return false
  }
}
