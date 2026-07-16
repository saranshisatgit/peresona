import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function POST() {
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(`a_session_${projectId}`)

  if (sessionCookie) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/account/sessions/current`, {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': projectId!,
          'Content-Type': 'application/json',
          Cookie: `a_session_${projectId}=${sessionCookie.value}`,
        },
      })
    } catch {}
  }

  cookieStore.delete(`a_session_${projectId}`)
  redirect('/admin/login')
}
