const RESEND_ENDPOINT = 'https://api.resend.com/emails'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://saranshsharma.me'
const FROM =
  process.env.RESEND_FROM_EMAIL || 'newsletter@saranshsharma.me'

type VerificationEmailKind = 'subscribe' | 'signin'

function buildVerificationEmail(
  kind: VerificationEmailKind,
  magicLink: string,
) {
  if (kind === 'signin') {
    return {
      subject: 'Your sign-in link',
      text: `Here is your link to sign in and read this post: ${magicLink}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f5f5f5;">
          <div style="background:#ffffff;border-radius:12px;padding:32px;">
            <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 12px;">Your sign-in link</h1>
            <p style="font-size:15px;color:#4a4a4a;line-height:1.6;margin:0 0 24px;">
              Click the button below to sign in and keep reading. The link
              expires in 30 minutes.
            </p>
            <p style="text-align:center;margin:0 0 24px;">
              <a href="${magicLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Sign in &amp; read</a>
            </p>
            <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">
              Didn't request this? You can safely ignore this email.
            </p>
          </div>
        </div>`,
    }
  }

  return {
    subject: 'Confirm your subscription',
    text: `Almost there! Confirm your subscription to unlock subscriber-only posts: ${magicLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f5f5f5;">
        <div style="background:#ffffff;border-radius:12px;padding:32px;">
          <h1 style="font-size:22px;color:#1a1a1a;margin:0 0 12px;">Almost there — one click to go</h1>
          <p style="font-size:15px;color:#4a4a4a;line-height:1.6;margin:0 0 24px;">
            You're not subscribed yet, but we'd love to make you one. Confirm
            below and you'll unlock subscriber-only posts right away. The link
            expires in 30 minutes.
          </p>
          <p style="text-align:center;margin:0 0 24px;">
            <a href="${magicLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Confirm &amp; read</a>
          </p>
          <p style="font-size:13px;color:#888;line-height:1.6;margin:0;">
            Didn't request this? You can safely ignore this email and you won't
            be subscribed.
          </p>
        </div>
      </div>`,
  }
}

export async function sendVerificationEmail(
  to: string,
  kind: VerificationEmailKind,
  token: string,
  redirectTo: string,
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('Email delivery is not configured')
  }

  const magicLink = `${SITE_URL}/api/reader/confirm?token=${encodeURIComponent(
    token,
  )}&redirect=${encodeURIComponent(redirectTo)}`

  const { subject, html, text } = buildVerificationEmail(kind, magicLink)

  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(
      `Resend error (${res.status}): ${data.message || 'unknown error'}`,
    )
  }
}
