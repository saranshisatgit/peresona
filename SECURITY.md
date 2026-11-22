# Security & subscriber ops

This site collects email subscribers, sends them email via Resend, and
stores everything in a **world-readable** Sanity dataset (that's what
keeps public content free to serve on the CDN). In November 2026 a bot
abused the subscribe endpoint to drain the Resend quota — the systems
below are the response. Read this before touching anything in the
subscribe flow, rotating secrets, or responding to a spam wave.

---

## 1. How subscriber data is stored (read this first)

The Sanity `production` dataset is public. **Never store anything
secret in it.** Subscriber documents therefore hold **no plaintext
address**:

| Field | What it is |
|---|---|
| `emailHash` | `HMAC-SHA256(secret, "subscriber-email:" + email)` — the only lookup key |
| `mailboxKeyHash` | HMAC of the canonical inbox (Gmail dots and `+tags` stripped) — kills the "dot trick" (`u.f.o.y.ar.uh.5.2.7@…` ≡ `ufoyaruh527@…`) |
| `emailEnc` | The address sealed with **AES-256-GCM**, format `v1.<iv>.<tag>.<ciphertext>` (base64) |
| `emailMasked` | Display form, e.g. `uf•••••@gmail.com` — what Studio shows |
| `lastEmailSentAt` / `sentEmailCount` | Cooldown bookkeeping — only stamped when an email **actually** went out |
| `signupIpHash` | HMAC of the signup IP — per-IP rate limiting without storing IPs |
| `status` | `active` / `inactive` / `blocked` (spam) |

Everything derives from **`READER_COOKIE_SECRET`** (HMAC keys + the AES
key, via scrypt). That single env var is load-bearing:

- It must be **identical** in Netlify and in local `.env.local`
  (scripts read it when sealing/hashing).
- Rotating it invalidates every sealed document and every reader
  cookie → see the runbook in §4 before you touch it.

Implementation: `src/lib/subscriber-crypto.ts` (crypto),
`src/lib/subscribe-guard.ts` (rate limits), `src/lib/subscribers.ts`
(upsert), `src/lib/reader-session.ts` (cookies, magic links,
unsubscribe tokens).

You can verify the list is unreadable at any time — this should return
**0**:

```bash
curl -s "https://3dxvlt1d.api.sanity.io/v2024-01-01/data/query/production" \
  --data-urlencode 'query=count(*[_type=="subscriber" && defined(email)])'
```

## 2. What guards the email endpoints

Both `/api/subscribe` and `/api/reader/verify` send email, so both run
the same pipeline, in order:

1. **Honeypot** — hidden `website` field; bots that fill it get a fake
   success and nothing happens.
2. **Cloudflare Turnstile** — invisible human check, verified
   server-side against `siteverify` (`src/lib/turnstile.ts`). Degrades
   **open** if `TURNSTILE_SECRET_KEY` is unset (a preview deploy without
   the var keeps working); fails **closed** on siteverify network
   errors.
3. **Strict validation** — `validateEmail()` rejects double dots,
   leading `+`, bad TLDs, overlong addresses, etc.
4. **Disposable-domain blocklist** (~40 domains).
5. **Session cap** — signed cookie `ss_send_limit`: max
   **3 emails per browser session per hour**, then HTTP 429.
6. **Sanity-backed limits** (fail closed if Sanity is unreachable):
   - per-mailbox cooldown: **1 email / inbox / hour** (repeats get a
     *silent* success — identical response, no email)
   - ≥3 address variants of one inbox → hard 429
   - per-mailbox daily cap: **5**
   - per-IP: **10 signups / day**
   - global Resend budget: **10 / hour, 50 / day** (env-tunable — §6)
7. **`blocked` status** — blocked addresses get 429s, their magic links
   stop working, and they are never reactivated.

Tuning knobs live at the top of `src/lib/subscribe-guard.ts`.

### Spam-incident runbook

When a signup flood shows up in Studio (or Resend usage spikes):

```bash
# 1. See what would be blocked (dry run)
node scripts/cleanup-spam-subscribers.mjs --since=2026-11-20T00:00:00Z

# 2. Block the flood window (reversible in Studio — set status back)
node scripts/cleanup-spam-subscribers.mjs --apply --since=2026-11-20T00:00:00Z

# 3. Re-seal any docs the old/plaintext flow may have created
node scripts/encrypt-subscribers.mjs --apply
```

The script blocks every `source == "website"` signup since the given
timestamp and also reports mailboxes with multiple dot-variants
(guaranteed abuse). **Blocked is not deletion** — you can un-block in
Studio if a real person got caught.

## 3. Sealing / re-sealing the mailing list

`scripts/encrypt-subscribers.mjs` is **idempotent**:

```bash
node scripts/encrypt-subscribers.mjs          # dry run
node scripts/encrypt-subscribers.mjs --apply   # seal legacy docs
```

- Legacy docs (plaintext `email`) are **deleted and recreated** with new
  IDs so plaintext can't survive in Sanity's revision history. Statuses
  (incl. `blocked`), send counters, and timestamps carry over.
- Dot-variant duplicates are deduped (active wins, then newest).
- It refuses to run without `READER_COOKIE_SECRET` — that's on
  purpose.

Run it after every deploy that follows a period where plaintext docs
could have been created (e.g. an attack happened while the old code
was live), and after any secret rotation (§4).

## 4. Runbook: rotating `READER_COOKIE_SECRET`

Rotation is safe but ordered. Don't freestyle it.

1. Generate: `openssl rand -hex 32`.
2. Put it in local `.env.local`.
3. **Seal the current list with the new secret first**, so hashes match
   the value that will be deployed:
   ```bash
   node scripts/encrypt-subscribers.mjs --apply
   ```
   …but note this seals with the *new* secret, so the **currently
   deployed site can't read those docs** until step 5 lands. Keep the
   gap short; pick a quiet hour. (Reader cookies from the old secret
   die too — subscribers re-verify with one email click.)
4. Commit & push code changes if any.
5. Update the value in Netlify env vars (saves trigger the deploy).
6. After the deploy: `node scripts/encrypt-subscribers.mjs --apply`
   again to catch stragglers, and spot-check the count in Studio.
7. Verify the public query in §1 still returns 0.

Netlify masks secret values — if you can't read the current value, you
**must** rotate (you can't recover it), which is exactly what happened
in Nov 2026 and produced this runbook.

## 5. Unsubscribe links

- `/api/unsubscribe` only accepts a **signed token** — never a bare
  email (anyone could otherwise unsubscribe arbitrary victims).
- Tokens: `signUnsubscribeToken()` in `src/lib/reader-session.ts` —
  `${base64url(email)}.${HMAC}` with its own HMAC domain, so an
  unsubscribe link can never be replayed as a reader (sign-in) cookie.
  They deliberately don't expire.
- The public page is `/unsubscribe?token=…` (masked-address confirm
  flow).
- **Newsletter sends must embed per-recipient tokens.**
  `scripts/send-newsletter.mjs` is still legacy (Appwrite) — when you
  migrate it to Sanity, compute `signUnsubscribeToken(email)` per
  recipient and use `${SITE_URL}/unsubscribe?token=${token}` for
  `{{UNSUBSCRIBE_URL}}` in `emails/newsletter-template.html`.

## 6. Environment variables

| Variable | Where | Notes |
|---|---|---|
| `READER_COOKIE_SECRET` | Netlify + `.env.local` | **Must match.** Derives all subscriber hashes + AES key + cookie signing. Rotation runbook in §4. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Netlify | Resend sending. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Netlify + `.env.local` | Cloudflare Turnstile. Widget hostnames must include `saranshsharma.me` (and `localhost` for local testing). |
| `EMAIL_HOURLY_LIMIT` / `EMAIL_DAILY_LIMIT` | Netlify (optional) | Global Resend budget. Defaults 10/hour, 50/day. |
| `SANITY_API_TOKEN` | Netlify | Needs **read + create + update** — the cooldown stamps (`lastEmailSentAt`) and unsubscribe status flips are `update`s. If it's create-only, rate limits silently degrade. |
| `SANITY_LOCAL_WRITER_KEY` | `.env.local` only | Full read/write token for local scripts. Never commit, never put in Netlify. |

## 7. What we did NOT do (and where the remaining risk is)

Honest list, ordered by value:

1. **Nothing rate-limits at the edge.** DNS points straight at Netlify,
   so every bot request still invokes a function + 1–2 Sanity queries.
   Putting Cloudflare's proxy in front (free plan) gives edge
   rate-limiting rules, bot-fight mode and a WAF — the biggest single
   upgrade left. Requires switching the two A records at Namecheap to
   proxied orange-cloud records.
2. **No DMARC record** on `saranshsharma.me`. Resend already signs
   DKIM/SPF; add a DMARC TXT record (`p=quarantine`,
   `rua=mailto:…`) to complete the set and get spoofing reports.
3. **Bounces aren't automated.** Resend can webhook bounces/complaints
   to an endpoint that flips `status` to `blocked` automatically —
   today you'd have to do it by hand in Studio.
4. **No monitoring/alerts.** Add a usage alert in the Resend dashboard,
   and consider a tiny scheduled script that pings the §1 count weekly
   (non-zero = something wrote plaintext somewhere).
5. **The dataset is still public.** If you ever upgrade Sanity (paid
   plans support private datasets), the cleaner long-term shape is a
   private `subscribers` dataset with plaintext fields again. The
   current encryption scheme exists because we're on the free plan.
6. **Studio subscriber list is masked by design.** To read the actual
   addresses (e.g. for a migration), decrypt `emailEnc` with the
   secret — `src/lib/subscriber-crypto.ts` shows the format. Never
   build a "decrypt in Studio" feature; that would require the secret
   in the browser.

## 8. Incident history

- **Nov 20–22 2026** — signup flood (~1 per 30–90 min, Gmail
  dot-trick variants) drained the Resend quota. 74 signups blocked,
  guard + Turnstile + encryption shipped in response.
  Commits: `4334266` (guard), `9653675` (encryption + hardening).
