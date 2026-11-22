/**
 * Server-side Cloudflare Turnstile verification for the email-sending
 * endpoints. The widget runs in the browser (NewsletterForm,
 * PostSubscribeForm, SubscribeGate); the token it produces is verified
 * here against Cloudflare's siteverify API — always from the server,
 * never from the browser, so the secret never leaves it.
 *
 * Degrades open when TURNSTILE_SECRET_KEY is unset (e.g. a preview
 * deploy) so subscriptions keep working; all other protections in
 * subscribe-guard still apply.
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn(
      '[turnstile] TURNSTILE_SECRET_KEY is not set — skipping human verification',
    )
    return true
  }
  if (typeof token !== 'string' || token.length < 10) return false

  try {
    const form = new FormData()
    form.set('secret', secret)
    form.set('response', token)
    if (remoteIp) form.set('remoteip', remoteIp)

    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body: form })
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean }
      | null
    return !!data?.success
  } catch (err) {
    console.error('[turnstile] siteverify request failed:', err)
    // Fail closed on network errors: an attacker shouldn't be able to
    // bypass the check by making siteverify unreachable.
    return false
  }
}
